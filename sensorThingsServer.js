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
var http = require('http');
var url = require('url');
var fs = require('fs');
//var json = require('json');

const selfUrl = "http://localhost:2000";
const base = "/v1.0/";
const things = "Things";
const locations = "Locations";
const historicalLocations = "HistoricalLocations";
const datastreams = "Datastreams";
const sensors = "Sensors";
const observedProperties = "ObservedProperties";
const observations = "Observations";
const featuresOfInterest = "FeaturesOfInterest";

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
function listImplementedCommands(res) {
  res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:8080'});
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
function listDatastreams(res) {
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
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:8080'});
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
function listObservations(res) {
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
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:8080'});
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
function listAvailableZones(res) {
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
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:8080'});
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
function getObservation(entity, res) {
  var filename = "./observations/" + entity + ".json";
  fs.readFile(filename, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:8080'});
    res.write(data);
    return res.end();
  });
}

/**
* Response to any other SensorThing API request which is currently not implemented
*/
function notImplemented(res) {
  res.writeHead(501, {'Content-Type': 'text/html'})
  return res.end("501 Not Implemented");
}

/**
* The server setup
*/
http.createServer(function (req, res) {
  let q = url.parse(req.url, true);
  let params = q.pathname.split("(");
  let command = params[0];
  let entity = params.length == 2 ? params[1].replace(")", "") : false;
  if (command === base) {
    listImplementedCommands(res);
  } else if (command === base + things && !entity) {
    listAvailableZones(res);
  } else if (command === base + datastreams && !entity) {
    listDatastreams(res);
  } else if (command === base + observations && !entity) {
    listObservations(res);
  } else if (command === base + observations) {
    getObservation(entity, res);
  } else if (command === base + sensors || command === base + observedProperties || command === base + featuresOfInterest ||
    command === base + locations || command === base + historicalLocations) {
    notImplemented(res);
  } else {
    res.writeHead(400, {'Content-Type': 'text/html'});
    return res.end("400 Bad Request");
  }
}).listen(2000);
