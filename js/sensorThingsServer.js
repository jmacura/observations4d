/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
* This script creates a simple HTTP server listening on port 2000.
* The server implements the most basic commands from SensorThings API,
* which are necessary for the Cesium application to load data from the filesystem
*
* @author jmacura 2019
*/

'use strict';
//const https = require('https');
const express = require('express');
//var http = require('http');
const url = require('url');
const fs = require('fs');
//var json = require('json');

const selfUrl = "http://jmacura.ml";
const base = "/api/v1.0/";
const things = "Things";
const locations = "Locations";
const historicalLocations = "HistoricalLocations";
const datastreams = "Datastreams";
const sensors = "Sensors";
const observedProperties = "ObservedProperties";
const observations = "Observations";
const featuresOfInterest = "FeaturesOfInterest";

function allowedOrigin(origin) {
  const origins = ['http://localhost:8080', 'http://localhost:2000', 'http://jmacura.ml', 'https://jmacura.ml', 'https://localhost:8080', 'https://localhost:2000'];
  return origins.includes(origin);
}

/**
* Thenable variant of reading list of files from a directory
*/
function readFiles(dirname) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirname, function(err, filenames) {
      if (err) {
        reject(err);
      }
      else {
        resolve(filenames);
      }
    });
  });
}

/**
* Response to /v1.0/
*/
function listImplementedCommands(res, origin) {
  res.writeHead(200, {
    'Referrer-Policy': 'origin',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'referrer-policy',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true'});
  const describe = {
    "value": [
      {
        "name": things,
        "url": selfUrl + base + things
      },
      {
        "name": datastreams,
        "url": selfUrl + base + datastreams
      },
      {
        "name": observations,
        "url": selfUrl + base + observations
      }
      /*{
        "name": featuresOfInterest,
        "url": selfUrl + base + featuresOfInterest
      }*/
    ]
  }
  res.write(Buffer.from(JSON.stringify(describe)));
  return res.end();
}

/**
* Response to /v1.0/Datastreams
*/
function listDatastreams(res, origin) {
  readFiles("./observations/").then((list) => {
    let jsonList = list.map(x => {
      const name = x.split(".").slice(0,-1).join(".");
      const selfLink = [selfUrl, base, datastreams, "(", name, ")"].join("");
      return {
        "@iot.id": name,
        "@iot.selfLink": selfLink,
        "description": "An datastream for room " + name.split("_")[1],
        "name": name,
        "Observations@iot.navigationLink": selfLink + "/" + observations,
        "Thing@iot.navigationLink": selfLink + "/Thing"
      }
    });
    res.writeHead(200, {
      'Referrer-Policy': 'origin',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'referrer-policy',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'});
    res.write(Buffer.from(JSON.stringify({
      "@iot.count": list.length,
      "value": jsonList
    })));
    return res.end();
  }).catch((reason) => {
    res.writeHead(500, {'Content-Type': 'text/html'});
    console.log("Reading O&M files unsucessful!");
    console.log(reason);
    return res.end();
  });
}

/**
* Response to /v1.0/Observations
*/
function listObservations(res, origin) {
  readFiles("./observations/").then((list) => {
    let jsonList = list.map(x => {
      const name = x.split(".").slice(0,-1).join(".");
      const selfLink = [selfUrl, base, observations, "(", name, ")"].join("");
      return {
        "@iot.id": name,
        "@iot.selfLink": selfLink,
        "description": "An observation in room " + name.split("_")[1],
        "Datastream@iot.navigationLink": selfLink + "/Datastream",
        "FeatureOfInterest@iot.navigationLink": selfLink + "/FeatureOfInterest"
      }
    });
    res.writeHead(200, {
      'Referrer-Policy': 'origin',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'referrer-policy',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'});
    res.write(Buffer.from(JSON.stringify({
      "@iot.count": list.length,
      "value": jsonList
    })));
    return res.end();
  }).catch((reason) => {
    res.writeHead(500, {'Content-Type': 'text/html'});
    console.log("Reading O&M files unsucessful!");
    console.log(reason);
    return res.end();
  });
}

/**
* Response to /v1.0/Things
*/
function listAvailableZones(res, origin) {
  readFiles("./models/gltf/").then((list) => {
    let jsonList = list.map(x => {
      const name = x.split(".").slice(0,-1).join(".");
      const selfLink = [selfUrl, base, things, "(", name, ")"].join("");
      return {
        "@iot.id": name,
        "@iot.selfLink": selfLink,
        "name": name,
        "description": "A room " + name,
        "Datastreams@iot.navigationLink": selfLink + "/Datastreams"
      }
    });
    res.writeHead(200, {
      'Referrer-Policy': 'origin',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'referrer-policy',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'});
    res.write(Buffer.from(JSON.stringify({
      "@iot.count": list.length,
      "value": jsonList
    })));
    return res.end();
  }).catch((reason) => {
    res.writeHead(500, {'Content-Type': 'text/html'});
    console.log("Reading glTF files unsucessful!");
    console.log(reason);
    return res.end();
  });
}

/**
* Response to /v1.0/Observations(id)
*/
function getObservation(entity, res, origin) {
  var filename = "./observations/" + entity + ".json";
  fs.readFile(filename, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    }
    res.writeHead(200, {
      'Referrer-Policy': 'origin',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'referrer-policy',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'});
    res.write(data);
    return res.end();
  });
}

/**
* Response to any other SensorThing API request which is currently not implemented
*/
function notImplemented(res, origin) {
  res.writeHead(501, {'Content-Type': 'text/html'})
  return res.end("501 Not Implemented");
}

/**
* The server setup
*/
/*const options = {
  key: fs.readFileSync("/home/jm/client-key.pem"),
  cert: fs.readFileSync("/home/jm/client-cert.pem")
};*/

var app = express();
app.use(function (req, res) {
  let q = url.parse(req.url, true);
  let params = q.pathname.split("(");
  //this is a workaround! #TODO: make work with req.headers.origin
  let orig = req.headers.host;
  //console.log("origin", orig);
  let command = params[0];
  let entity = params.length == 2 ? params[1].replace(")", "") : false;
  /*if (!allowedOrigin(orig)) {
    res.writeHead(403, {'Content-Type': 'text/html'});
    return res.end("403 Origin forbiden");
  } else*/ if (command === base) {
    listImplementedCommands(res, orig);
  } else if (command === base + things && !entity) {
    listAvailableZones(res, orig);
  } else if (command === base + datastreams && !entity) {
    listDatastreams(res, orig);
  } else if (command === base + observations && !entity) {
    listObservations(res, orig);
  } else if (command === base + observations) {
    getObservation(entity, res, orig);
  } else if (command === base + sensors || command === base + observedProperties || command === base + featuresOfInterest ||
    command === base + locations || command === base + historicalLocations) {
    notImplemented(res, orig);
  } else {
    res.writeHead(400, {'Content-Type': 'text/html'});
    return res.end("400 Bad Request: " + command);
  }
}).listen(2000);

//https.createServer(options, app).listen(2000);
