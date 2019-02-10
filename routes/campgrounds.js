var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");


//INDEX - show all campgrounds
router.get("/", function(req, res){
    // Get all campgrounds from DB
    Campground.find({}, function(err, allCampgrounds){
       if(err){
           console.log(err);
       } else {
          res.render("campgrounds/index",{campgrounds:allCampgrounds});
       }
    });
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, function(req, res){
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var image = req.body.image;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newCampground = {name: name, image: image, description: desc, author:author}
    // Create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            console.log(newlyCreated);
            res.redirect("/campgrounds");
        }
    });
});

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

// SHOW - shows more info about one campground
router.get("/:slug", function(req, res){
    //find the campground with provided ID
    Campground.findOne({slug: req.params.slug}).populate("comments").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            console.log(foundCampground)
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:slug/edit", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findOne({slug: req.params.slug}, function(err, foundCampground){
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:slug",middleware.checkCampgroundOwnership, function(req, res){
    // find and update the correct campground
    Campground.findOne({slug: req.params.slug}, function(err, campground){
       if(err){
           res.redirect("/campgrounds");
       } else {
           campground.name = req.body.campground.name;
           campground.description = req.body.campground.description;
           campground.image = req.body.campground.image;
           campground.save(function (err) {
             if(err){
               console.log(err);
               res.redirect("/campgrounds");
             } else {
               res.redirect("/campgrounds/" + campground.slug);
             }
           });
       }
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:slug",middleware.checkCampgroundOwnership, function(req, res){
   Campground.findOneAndRemove({slug: req.params.slug}, function(err){
      if(err){
          res.redirect("/campgrounds");
      } else {
          res.redirect("/campgrounds");
      }
   });
});


module.exports = router;

