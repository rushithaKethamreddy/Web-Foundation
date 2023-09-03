const express = require('express');
const app = express();
const port = 8080; // You can use any port number you prefer

// Importing required modules
const path = require('path'); // Importing path module for working with file and directory paths
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
app.use('/public', express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://127.0.0.1:27017/Rushitha');
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'view'));
const fileUpload = require('express-fileupload');
// Serve static files (CSS, JS, images, etc.) from the 'public' directory
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
const session = require('express-session');

app.use(session({
  secret: 'randomsecretcode',
  resave: false,
  saveUninitialized: true
}));


app.use(fileUpload());

const user = mongoose.Schema({
  username: String,
  password: String,
});

const Page = mongoose.model('pageNew', {
  pageTitle: String,
  titleBox: String,
  description: String,
  heroImagePath: String,
});

const UserModel = mongoose.model('datavalue', user);

// Middleware to fetch pages data
app.use(async (req, res, next) => {
  try {
    const pages = await Page.find().exec();
    res.locals.pages = pages; // Make pages data available to views
    next();
  } catch (error) {
    console.error('Error fetching pages data:', error);
    res.locals.pages = []; // Set pages data to an empty array in case of an error
    next();
  }
});

// Now define your routes

// Your other route handlers

app.get('/', async (req, res) => {
  try {
    const pages = await Page.find().exec();
    res.render('home', { pages, errors: [] });
  } catch (err) {
    console.error('Error fetching data:', err);
    const errorMessage = "An error occurred while fetching data from the database.";
    res.render('home', { pages: [], errors: [{ msg: errorMessage }] });
  }
});


app.get('/addpage', (req, res) => {
  return res.render('addpage', { pageTitle: '', titleBox: '', description: '', er: [] });
});


app.post('/signin', [
  check('username', 'please enter username').notEmpty(),
  check('password', 'please enter password').notEmpty()
], function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    var pageData = {
      errors: errors.array()
    };
    return res.render('home', pageData);
  } else {
    UserModel.findOne({username: req.body.username}).then((user) => {
      if(!user || user.username != req.body.username || user.password != req.body.password){
        console.log("username details",user);

        loginError = {
          msg: 'Please enter correct details',
        };
        errors.errors.push(loginError); // Add loginError to the errors array
        var pageDatas = {
          errors: errors.array()
        };
        res.render('home', pageDatas);
      }
      else{
        console.log("user values:",user);
        req.session.username = user.username;
        req.session.isLoggedIn = true;
        res.render('login');
      }
    });
  }
});

const filePath = 'public/images/';
app.post('/sigin', [
  check('description', 'Please enter a description.').not().isEmpty(),
  check('titleBox', 'Please enter valid titleBox').not().isEmpty(),
  check('pageTitle', 'Please enter title').not().isEmpty(),
  check('heroImage').custom((value, { req }) => {
    if (!req.files || !req.files.heroImage) {
      throw new Error('No image uploaded');
    }
    return true;
  }),
], async (req, res,next) => {
  
  // check for errors
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {

     return res.render('addpage', { er: errors.array() });
      console.log(er);
  }
  
  else {
      //fetch all the form fields
      var pageTitle = req.body.pageTitle; // the key here is from the name attribute not the id attribute
      var titleBox = req.body.titleBox;
      var description = req.body.description;
      console.log(pageTitle + "  " + titleBox + "  " + description);
      // create an object with the fetched data to send to the view
      var heroImage = req.files.heroImage;
      var heroImageName = heroImage.name;
      var heroImageSavePath = filePath + heroImageName;
      heroImage.mv(heroImageSavePath, function (err) {
          if (err)
              console.log(err);

      })
      var pageData = {
        pageTitle: pageTitle,
        titleBox: titleBox,
          description: description,
          heroImagePath: 'images/' + heroImageName,

      }
      var pageNew = new Page(pageData);
      pageNew.save();
      // send the data to the view and render it
      res.render('addSucc', pageData);
  }
});

app.get('/editpage', async (req, res) => {
  try {
    const pages = await Page.find().exec();
    res.render('editpage', { pages: pages, errorMessage: null });
  } catch (err) {
    console.error("Error fetching data:", err);
    const errorMessage = "An error occurred while fetching data from the database.";
    res.render('editpage', { pages: [], errorMessage: errorMessage });
  }
});
app.get('/edit', async (req, res) => {
  try {
    const pageId = req.query.pageId;
    const page = await Page.findById(pageId);

    res.render('edit', { page }); // Pass the 'page' data to the template
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).send('Error fetching page');
  }
});

// Add the following route handler for updating page details
app.post('/updatepage/:pageId', async (req, res) => {
  try {
    const pageId = req.params.pageId;
    const updatedData = {
      pageTitle: req.body.pageTitle,
      titleBox: req.body.titleBox,
      description: req.body.description,
    };

    // Check if a new hero image is uploaded
    if (req.files && req.files.heroImage) {
      const heroImage = req.files.heroImage;
      const heroImageName = heroImage.name;
      const heroImageSavePath = filePath + heroImageName;
      heroImage.mv(heroImageSavePath, function (err) {
        if (err) {
          console.log(err);
        }
      });
      updatedData.heroImagePath = 'images/' + heroImageName;
    }

    // Update the page in the database
    await Page.findByIdAndUpdate(pageId, updatedData);

    // Fetch the updated page data
    const updatedPage = await Page.findById(pageId);

    // Render a success page with the updated data
    res.render('editSucc', { updatedPage });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).send('Error updating page');
  }
});



app.get('/delete', async (req, res) => {
  try {
    const pageId = req.query.pageId;

    // Find the page in the database and remove it
    const pageToDelete = await Page.findByIdAndRemove(pageId);

    // Render the delete confirmation template
    res.render('delete');
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).send('Error deleting page');
  }
});
// Middleware to fetch pages data
app.use(async (req, res, next) => {
  try {
    const pages = await Page.find().exec();
    res.locals.pages = pages; // Make pages data available to views
    next();
  } catch (error) {
    console.error('Error fetching pages data:', error);
    res.locals.pages = []; // Set pages data to an empty array in case of an error
    next();
  }
});

// Your other route handlers

app.get('/logout', function (req, res) {
  req.session.username = null;
  req.session.isLoggedIn = false;
  res.render('logout'); // Render the logout view without passing pages data
});

app.get(['/logout', '/page/:id'], async (req, res) => {
  try {
    const pageId = req.params.id;
    const pageDetails = await Page.findById(pageId);

    if (!pageDetails) {
      return res.status(404).render('error', { message: 'Page not found' });
    }

    // Render the page details view with the available pages data
    return res.render('pagedetails', { pageDetails, pages: res.locals.pages });
  } catch (error) {
    console.error(error);
    return res.status(500).render('error', { message: 'Internal server error' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
