require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const usersController = require('./controllers/UserController')
const mainController = require('./controllers/MainController')
const bodyParser = require('body-parser')
const app = express();
const port = process.env.PORT || 5000;
const cron = require('node-cron');


const mongoURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`
mongoose.set('useFindAndModify', false)

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.urlencoded({
  extended: true
}))
app.use(cors({
  origin: '*'
}))

app.options('*', cors())

/**
 * USER ON-BOARDING ROUTES
 */

app.get('/api/v1', (req, res) => {
  res.json({
    message: "Welcome to Dengue Heatmap API"
  })
})

// user registration
app.post('/api/v1/users/register', usersController.register)

// user login route
app.post('/api/v1/users/login', usersController.login)

// user profile route
app.post('/api/v1/users/profile', usersController.updateUserProfile)

//api route
app.get('/api/v1/clusters', mainController.getClusters)
app.get('/api/v1/getclustersfromapi', mainController.getClustersFromApi)
app.get('/api/v1/storeclusters', mainController.storeClusters)

// seed user route
app.get('/api/v1/seedUser', usersController.seedUsers)

// get nearest risk distance
app.post('/api/v1/getNearestRiskAreaDistance', mainController.getNearestRiskAreaDistance)

//saved locations for registerd user
app.post('/api/v1/getUsersSavedLocations', usersController.getUsersSearchLocation)
//add locations for registerd user
app.post('/api/v1/addUserSavedLocations', usersController.AddUsersSearchLocation)
//delete locations for registerd user
app.post('/api/v1/deleteUserSavedLocations', usersController.DeleteSavedLocation)

// app.get('/api/v1/sendNotifications', mainController.notifyUsersInRiskArea);

cron.schedule('* * 8 * * *', () => {
  mainController.storeClusters()
  mainController.notifyUsersInRiskArea()
}, {
  scheduled: true,
  timezone: "Asia/Singapore"
});



// connect to DB, then inititate Express app
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(response => {
    // DB connected successfully
    console.log('DB connection successful')

    app.listen(port, () => {
      console.log(`Dengue Heatmap app listening on port: ${port}`)
    })
  })
  .catch(err => {
    console.log(err)
  })

function verifyJWT(req, res, next) {
  // get the jwt token from the request header
  const authToken = req.headers.auth_token

  // check if authToken header value is empty, return err if empty
  if (!authToken) {
    res.json({
      success: false,
      message: "Auth header value is missing"
    })
    return
  }

  // verify that JWT is valid and not expired
  try {
    // if verify success, proceed
    const userData = jwt.verify(authToken, process.env.JWT_SECRET, {
      algorithms: ['HS384']
    })
    next()
  } catch (err) {
    // if fail, return error msg
    res.json({
      success: false,
      message: "Auth token is invalid"
    })
    return
  }
}


