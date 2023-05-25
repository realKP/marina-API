const express = require('express');
const bodyParser = require('body-parser');
const path = require("path");
const ds = require('./datastore');
const datastore = ds.datastore;
require('dotenv').config();

const app = express();
app.use(express.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.enable('trust proxy');

const { auth, requiresAuth } = require('express-openid-connect');

const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: process.env.BASE_URL,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: `https://${process.env.DOMAIN}`,
    secret: process.env.CLIENT_SECRET,
    routes: {
        login: false
    }
};
app.use(auth(config))

// Routes for Boats and Loads
app.use('/boats', require('./boats'));
app.use('/loads', require('./loads'));

/* ------------- Begin Users Model Functions ------------- */
function make_URL(protocolName, hostName, base, id){
  const selfUrl = protocolName + "://" + hostName + base + "/" + id;
  return selfUrl
}

function post_user(sub_id){
  var key = datastore.key("User");
  const new_user = { "sub_id": sub_id };
  return datastore.save({"key": key, "data":new_user}).then(() => {return key});
}

function get_users(){
  var q = datastore.createQuery("User");
  const results = {};
  return datastore.runQuery(q).then( (entities) => {
    results.users = entities[0];
    return results;
  });
}

function get_user(sub_id){
  var q = datastore.createQuery("User").filter('sub_id', '=', sub_id);
  return datastore.runQuery(q).then( (entity) => {
    return entity[0];
  });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Users Controller Functions ------------- */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
  res.oidc.login({ returnTo: '/profile' })
});

app.get('/profile', requiresAuth(), (req, res) => {
  res.set("Content-Type", "text/html");
  const page = `<!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <title>User Info - HW7</title>
  </head>
  <body>
      <h1>User Info</h1>
      <ul>
          <li><b>Unique ID</b>: ${req.oidc.user.sub}</li>
          <li><b>JWT</b>: ${req.oidc.idToken}</li>
      </ul>
      <form action="/logout" method="GET">
          <button type="submit">Logout</button>
      </form>
  </body>
  </html>`;
  get_user(req.oidc.user.sub)
  .then(user =>{
    if (user[0] === undefined || user[0] === null){
      // User does not exist, add to datastore
      post_user(req.oidc.user.sub).then(res.send(page));
    } else{
      // User already exists
      res.send(page)
    }
  })
});

app.get('/users', (req, res) => {
  res.set("Content-Type", "application/json");

  //Checks MIME types
  const accepts = req.accepts(['application/json']);
  if(!accepts){
    // No acceptable type
    res.status(406).json({"Error": "Requested MIME type not supported by endpoint" });
    return;
  }

  get_users()
	.then( (users) => {
    for (let user of users.users){
      const userURL = make_URL(req.protocol, req.get("host"), "/users", encodeURIComponent(user.sub_id))
      user.self = userURL
    }
    res.status(200).json(users);
  })
});

/* ------------- End Users Controller Functions ------------- */

// Error handling
app.use(function (err, req, res, next) {
  res.set("Content-Type", "application/json");
  if (err.name === "UnauthorizedError") {
      res.status(401).json({"Error": "The request has an invalid JWT"});
  } else {
      next(err);
  }
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});