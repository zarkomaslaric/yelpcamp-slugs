# YelpCamp Slugs (semantic campground URLs)

### Campground show page (using semantic URLs instead of ids):
![YelpCamp Slugs Screenshot](https://i.imgur.com/9DVDaQK.png)

This tutorial is based on technologies that we've learned in the course. We will implement logic that allows us to have semantic campground names in the browser address bar (instead of MongoDB ids).

### 1) The updated Campground model - see the code here: [models/campground.js](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/models/campground.js)

First we focus on the Campground model updates that we need for the URL slugs to work properly.

I made **name** a required field, and defined an error message if the user tries saving a campground without a name.

```
    name: {
        type: String,
        required: "Campground name cannot be blank."
    },
```

Also, we add a new string field called **slug** field which we use to create and save the semantic URL for a campground. We will use the slug field instead of the id in our routes, and also in the EJS views.

```
    slug: {
        type: String,
        unique: true
    }
```

We don't want to allow the user to specify the slug, however. Therefore, we can use a mongoose 'pre save' hook, which gets executed before the campground gets saved to the database.

We use the `this.isNew` property (which comes from mongoose) to check if the campground is getting saved for the first time (the **this** keyword refers to the new campground that is getting created).

Also, we are using the mongoose `this.isModified("name")` method to check if the campground name is being updated via the PUT route (to generate a new slug accordingly, if needed). 

In conclusion, if it is a new campground or if the campground name is being updated, we define its **slug** property by assigning a value to **this.slug**.

You can read about try-catch blocks [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch).

```
// add a slug before the campground gets saved to the database
campgroundSchema.pre('save', async function (next) {
    try {
        // check if a new campground is being saved, or if the campground name is being modified
        if (this.isNew || this.isModified("name")) {
            this.slug = await generateUniqueSlug(this._id, this.name);
        }
        next();
    } catch (err) {
        next(err);
    }
});

var Campground = mongoose.model("Campground", campgroundSchema);

module.exports = Campground;
```

There is a new JavaScript feature that we use here, which is called **async/await**, that allows us to simplify our syntax when we wait for asynchronous calls to finish execution (instead of using callback functions like we do in YelpCamp).

You can learn more about JavaScript **async** and **await** here:
- [https://www.youtube.com/watch?v=krAYA4rvbdA](https://www.youtube.com/watch?v=krAYA4rvbdA)
- [https://www.youtube.com/watch?v=D_q-sQCdZXw](https://www.youtube.com/watch?v=D_q-sQCdZXw)

To generate a unique slug based on the campground name, we will create a function called **generateUniqueSlug**:

```
async function generateUniqueSlug(id, campgroundName, slug) {
    try {
        // generate the initial slug
        if (!slug) {
            slug = slugify(campgroundName);
        }
        // check if a campground with the slug already exists
        var campground = await Campground.findOne({slug: slug});
        // check if a campground was found or if the found campground is the current campground
        if (!campground || campground._id.equals(id)) {
            return slug;
        }
        // if not unique, generate a new slug
        var newSlug = slugify(campgroundName);
        // check again by calling the function recursively
        return await generateUniqueSlug(id, campgroundName, newSlug);
    } catch (err) {
        throw new Error(err);
    }
}

function slugify(text) {
    var slug = text.toString().toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '')          // Trim - from end of text
        .substring(0, 75);           // Trim at 75 characters
    return slug + "-" + Math.floor(1000 + Math.random() * 9000);  // Add 4 random digits to improve uniqueness
}
```

The **generateUniqueSlug** function accepts 3 arguments - the campground id and name and one optional argument, slug.

If the **slug** parameter isn't provided, we generate a new slug by calling the **slugify** function:

```
        // generate the initial slug
        if (!slug) {
            slug = slugify(campgroundName);
        }
```

The **slugify** function takes the campground name and generates a friendly URL string based on it (check the slugify function comments to see what it does exactly).

Now, we want to make sure that the generated slug is unique, otherwise we may run into issues in our app. To do that, we use the `Campground.findOne({slug: slug})` method which allows check if a campground with the same slug already exists.

If the campground variable is undefined (`!campground` would be true), that means that there is no same slug in the database, and that the newly generated slug is unique. In that case, we can return the unique slug from our function, which then gets assigned to **this.slug** in the mongoose 'pre save' hook.

Also, we use `campground._id.equals(id))` to check if the current campground owns the found slug (when updating an existing campground), in which case we can allow its usage further.

Otherwise, if neither of these conditions are true, it means that the generated slug is not unique and that it's owned by a different campground. In that case, we want to run the function again to (re)generate a unique slug, and then we call the generateUniqueSlug function again, recursively. This is repeated all the way until we generate a unique slug.

After this is done, we need to alter our routes to use the slug field instead of the id field. In addition to that, we also need to alter the EJS logic (paths) accordingly.

### 2) Updated app.js - see the code here: [app.js](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/app.js)

We want to update the commentRoutes prefix to use `:slug` instead of `:id`:

```
app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:slug/comments", commentRoutes);
```

### 3) Campground routes - see the code here: [routes/campgrounds.js](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/routes/campgrounds.js)

- The show route needs to be updated to use `:slug` instead of `:id`, and we also want to use `Campground.findOne()` instead of `Campground.findById()`, which allows us to find a campground based on a custom field (the **slug** field, in our case).

```
router.get("/:slug", function(req, res){
    //find the campground with provided ID
    Campground.findOne({slug: req.params.slug}).populate("comments").exec(function(err, foundCampground){
```

- We apply similar changes to the edit, update and delete routes (we use `:slug` instead of `:id`, the **findOne** method and **req.params.slug**. Also, we need to use **campground.slug** to res.redirect() correctly, based on our new route changes.

- Most notably, we have to modify the PUT route to use the `campground.save()` method which triggers the 'pre save' hook that we defined in the Campground model previously. This will allow our slug to update if the campground name was modified. The `Campground.findByIdAndUpdate()` or `Campground.findOneAndUpdate()` method would not trigger the 'pre save' hook that we defined for the model.

```
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
```

### 4) Altered middleware function to use req.params.slug: [middleware/index.js](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/middleware/index.js)

We similarly need to modify the checkCampgroundOwnership middleware function to also use req.params.slug and Campground.findOne():

```
middlewareObj.checkCampgroundOwnership = function(req, res, next) {
 if(req.isAuthenticated()){
        Campground.findOne({slug: req.params.slug}, function(err, foundCampground){
           if(err){
               req.flash("error", "Campground not found");
               res.redirect("back");
           }  else {
               // does user own the campground?
            if(foundCampground.author.id.equals(req.user._id)) {
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
           }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}
```

### 5) Updated comment routes - see the code here: [routes/comments.js](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/routes/comments.js)

Wherever we used Campground.findById() in the comment routes (and req.params.id), we need to update it to use Campground.findOne() and req.params.slug. Also, we need to use req.params.slug in the res.redirect() to the campground show page, for everything to work correctly.

**Please see the linked [routes/comments.js](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/routes/comments.js) code to view the changes.**

Also, notice the comment edit (GET) route specific update (we use `campground_slug` instead of `campground_id`):

```
// COMMENT EDIT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
   Comment.findById(req.params.comment_id, function(err, foundComment){
      if(err){
          res.redirect("back");
      } else {
        res.render("comments/edit", {campground_slug: req.params.slug, comment: foundComment});
      }
   });
});
```

### 6) Changes to the EJS  views: [views folder link](https://github.com/zarkomaslaric/yelpcamp-slugs/tree/master/views)

We need to change the usage of `<%= campground._id %>` to `<%= campground.slug %>` in all the link and form paths in our EJS views. Please find the updated EJS templates below (you can use diffchecker.com to compare the changes with the original files):

- **campgrounds/index.ejs**: [views/campgrounds/index.ejs](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/views/campgrounds/index.ejs) - we update the 'More info' link

- **campgrounds/show.ejs**: [views/campgrounds/show.ejs](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/views/campgrounds/show.ejs) - we update the paths in the campground and comment edit/delete buttons, as well as the add new comment link

- **campgrounds/edit.ejs**: [views/campgrounds/edit.ejs](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/views/campgrounds/edit.ejs) - we update the form submit path (action attribute)

- **comments/new.ejs**: [views/comments/new.ejs](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/views/comments/new.ejs) - we update the form submit path (action attribute)

- **comments/edit.ejs**: [views/comments/edit.ejs](https://github.com/zarkomaslaric/yelpcamp-slugs/blob/master/views/comments/edit.ejs) - we use `campground_slug` instead of `campground_id`, because the comment edit (GET) route was updated to this:

```
res.render("comments/edit", {campground_slug: req.params.slug, comment: foundComment});
```

# Final words

I hope you find this extra feature for YelpCamp useful! Make sure to check the full repository to review all code changes that needed to be done in order to implement it to our application: [https://github.com/zarkomaslaric/yelpcamp-slugs](https://github.com/zarkomaslaric/yelpcamp-slugs)
