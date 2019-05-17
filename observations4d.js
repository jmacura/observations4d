/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
* ...
*
* @author jmacura 2018--2019
*/

'use strict';

//global variables
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4MGExNDZiMi00NDAwLTQ1NGMtOTY4Mi01NWYwNmI1OTE3OTgiLCJpZCI6NTE4NCwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjY1Nzg5M30.LiC7Odu155lrYB8ckNEE83UxkWCQbKbCkEM7nlWPf_0';
Cesium.MapboxApi.defaultAccessToken = 'pk.eyJ1IjoieWptIiwiYSI6ImNqdmpnbGYyMDA3ejc0YnJpaml2NWtuaW0ifQ.AhR5rB20QKj5F6YHLgDfQA';
var tMin = Infinity;
var tMax = -Infinity;
var startDate;
var endDate;


/**
 * getBaseHeight - A hook to position the rooms to the right height
 * needs to be changed manually for another building
 *  
 * @param  {String} modelName ID of the room
 * @return {Number}           base height of this room
 */
function getBaseHeight(modelName) {
  let lvlBaseHeights = [0.46, 3.25, 8.07, 12.53, 15.87, 19.21, 22.55];
  let lvl = (modelName[2] != "W") ? modelName[2] : modelName[3]; //ternary because of the UNW.. IDs
  //console.log(lvl);
  return lvlBaseHeights[lvl];
}


/**
 * readKml - For given ID of the room, it reads a KML file from the filesystem
 * and returns coordinates of an anchor point for the glTF model of the room
 *
 * @param  {String} objectName ID of the room for which the anchor point should be obtained
 * @return {Promise}           Promise, which resolves with an array of coordinates
 */
function readKml(objectName) {
  let objUrl = "./models/kml/" + objectName + ".kml";
  return new Promise(
    (resolve,reject) => {
      $.ajax({
        url: objUrl,
        dataType: 'xml',
        type: 'GET',
        async: true
      }).done((data, stat) => {
        //console.log("noerror");
        let location = data.getElementsByTagName("Location")[0];
        resolve([location.children[0].firstChild.data, location.children[1].firstChild.data, location.children[2].firstChild.data]);
      }).fail((error) => {
        console.log("Error! Loading a KML file of " + objectName + " was unsuccessful.");
        console.log(error);
        reject(error);
      });
    });
}

'use strict';

function readOM(objectName) {
  let objUrl = "http://localhost:2000/v1.0/Observations(temperature_" + objectName + ")";
  return new Promise(
    (resolve,reject) => {
      $.ajax({
        url: objUrl,
        dataType: 'json',
        type: 'GET',
        async: true,
        crossDomain: true
      }).done((data, stat) => {
        //console.log("noerror");
        resolve(data);
      }).fail((error) => {
        console.log("Error! Loading O&M file of sensor ID '" + objectName + "' was unsuccessful.");
        reject(error);
      });
    });
}

function generateCzmlUpdate(observations) {
  let id = observations.featureOfInterest;
  let epoch = observations.result.points[0].time.instant;
  let temperatureSamples = [];
  observations.result.points.forEach((val) => {
    temperatureSamples.push(val.time.instant);
    temperatureSamples.push(val.value);
  });
  return {
    "id" : id,
    "properties": {
      "fav_temperature": {
        //TODO: different interpolation algorithm?
        "number": temperatureSamples
      }
    }
  }
}

function setTimeTempVars(obs) {
  startDate = obs.phenomenonTime.begin;
  endDate = obs.phenomenonTime.end;
  let min = Math.min(...obs.result.points.map(obj => {return obj.value}));
  let max = Math.max(...obs.result.points.map(obj => {return obj.value}));
  tMin = min < tMin ? min : tMin;
  tMax = max > tMax ? max : tMax;
}

/**
* This fction does return Promise, hence it fulfills after
* all asynchronous requests fullfills
*/
function readObservations(dataSource, zoneList) {
  //console.log(dataSource.entities.values.length);
  return new Promise((resolve, reject) => {
    resolve(Promise.all(
      zoneList.map(entity => {
        let id = entity.name;
        return readOM(id).then((data) => {
          //console.log("fuj");
          setTimeTempVars(data);
          let czml = generateCzmlUpdate(data);
          //console.log("obser:", dataSource.entities.values.length);
          return dataSource.process(czml);
        }).catch(err => console.log("inall:", err));
      })
    ).then((res) => {
      return dataSource;
    }).catch(err => console.log("outall:", err))
  )})
}

/**
 * generateCzmlItem - For given ID of the room it requests glTF and KML data
 *  and converts them into a CZML Packet
 *
 * @param  {String} item ID of the room
 * @return {Object}      A CZML Packet describing the room
 */
function generateCzmlItem(item) {
  let hpr = new Cesium.HeadingPitchRoll(Cesium.Math.PI_OVER_TWO, 0, 0); // Collada uses different axis definition then Cesium
  let origin = Cesium.Cartesian3.fromDegrees(13.351798339078506, 49.726704604699599); //wtf????????????
  let uq = Cesium.Transforms.headingPitchRollQuaternion(origin, hpr);
  //uq = Cesium.Quaternion.fromHeadingPitchRoll(hpr);
  //console.log(uq);
  let id = item.split(".")[0];
  return readKml(item).then((coords) => {
    //console.log(coords);
    //console.log(lvlBaseHeights[lvl]);
    return {
      "id" : id,
      "name" : id,
      //TODO: zkusit
      /*"clock":{
        "interval":"2012-03-15T10:00:00Z/2012-03-16T10:00:00Z",
        "currentTime":"2012-03-15T10:00:00Z",
        "multiplier":60,
        "range":"LOOP_STOP",
        "step":"SYSTEM_CLOCK_MULTIPLIER"
      }*/
      "position" : {
        "cartographicDegrees" : [coords[0], coords[1], getBaseHeight(item)]
      },
      "orientation": {
        "unitQuaternion": [uq.x, uq.y, uq.z, uq.w]
      },
      "properties": { //essentail: this is used to colorize the zones!!
        "fav_temperature": {}
      },
      "model": {
        "gltf" : "./models/gltf/" + item + ".gltf",
        "scale" : 1.0,
      }
    }
  });
}


/**
 * getZoneList - Requests a list of zones available on the server for visualisation
 *
 * @return {Promise}  Promise, which resolves with the list of available zones
 */
function getZoneList() {
  let url = "http://localhost:2000/v1.0/Things";
  return new Promise(
    (resolve,reject) => {
      $.ajax({
        url: url,
        dataType: 'json',
        type: 'GET',
        async: true,
        crossDomain: true
      }).done((data, stat) => {
        console.log("OK! List of building zones loaded successfully.");
        resolve(data.value);
      }).fail((error) => {
        console.log("Error! Loading list of building zones was unsuccessful.");
        console.log(error);
        reject(error);
      });
  });
}

//TODO: menit spojite
function colorize(t) {
  let interval = (tMax-tMin)/4;
  if (t < (tMin + interval)) {
    return new Cesium.Color(0.2, 0.5, 0.7, 0.6);
  } else if (t < (tMin + interval * 2)) {
    return new Cesium.Color(0.3, 0.5, 0.5, 0.6);
  } else if (t < (tMin + interval * 3)) {
    return new Cesium.Color(0.7, 0.5, 0.2, 0.6);
  } else {
    return new Cesium.Color(0.9, 0.3, 0.1, 0.6);
  }
}

/**
* Do not log anything here!!! Would blow up the browser console!!!
*/
function temperatureCallback(time, result) {
  let entity = this;
  //entity.model.shadows = Cesium.ShadowMode.DISABLED;
  entity.model.colorBlendMode = Cesium.ColorBlendMode.REPLACE;
  entity.model.imageBasedLightingFactor = Cesium.Cartesian2(0.0,0.0);
  entity.model.lightColor = Cesium.Cartesian3(0.7,0.7,0.7);
  let temperature = entity.properties.fav_temperature.getValue(viewer.clock.currentTime);
  if (!temperature) {
    let defaultColor = new Cesium.Color(0.5, 0.5, 0.5, 0.3);
    Cesium.Color.clone(defaultColor, result);
    return result;
  }
  let color = colorize(temperature);
  Cesium.Color.clone(color, result);
  return color;
}

function setViewer() {
  let julianStartTime = Cesium.JulianDate.fromDate(new Date(startDate));
  let julianStopTime = Cesium.JulianDate.fromDate(new Date(endDate));
  viewer.clock.startTime = julianStartTime;
  viewer.clock.stopTime = julianStopTime;
  viewer.clock.currentTime = julianStartTime;
  viewer.clock.multiplier = 60;
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  viewer.timeline.zoomTo(julianStartTime, julianStopTime);
  console.log(viewer.clockViewModel);
  // Create an initial camera view
  let homeCameraView = {
    destination : Cesium.Cartesian3.fromDegrees(13.35235098730768, 49.726573629543751, 300.0),
    /*orientation : {
      heading : Cesium.Math.toRadians(0.0),
      pitch : Cesium.Math.toRadians(-40.0),
      roll : 0.0
    }*/
  };
  viewer.camera.flyTo(homeCameraView);
  homeCameraView.duration = 2.0;
  homeCameraView.maximumHeight = 2000;
  homeCameraView.pitchAdjustHeight = 2000;
  homeCameraView.endTransform = Cesium.Matrix4.IDENTITY;
  // Override the default home button
  viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (e) {
    e.cancel = true;
    viewer.scene.camera.flyTo(homeCameraView);
  });
  //infobox
  drawLegend();
  //viewer.infoBox.viewModel.titleText = "SHIT";
  //viewer.infoBox.viewModel.description = "Lorem Ipsum Dolor Sit Amet";
  //viewer.infoBox.viewModel.showInfo = true;
  //viewer.shadows = false;
  //viewer.scene.globe.enableLighting = false;
  //viewer.shadowMap.enabled = false;
}

function drawLegend() {
  function htmlDecode(value) {
    return $("<textarea/>").html(value).text();
  }
  $(document.getElementById("toolbar").firstElementChild).append("<caption>Temperature</caption>");
  let tbody = document.getElementById("toolbar").firstElementChild.firstElementChild;
  const reds = [0.5, 0.2, 0.3, 0.7, 0.9].map(x => x*255);
  const greens = [0.5, 0.5, 0.5, 0.5, 0.3].map(x => x*255);
  const blues = [0.5, 0.7, 0.5, 0.2, 0.1].map(x => x*255);
  let interval = (tMax-tMin)/4;
  for (let i = 4; i >= 0; i--) {
    let legendBox = document.createElement("TD");
    $(legendBox).addClass("legendBox");
    let color = 'rgb(' + reds[i] + ', ' + greens[i]  + ', ' + blues[i] + ', 0.6)';
    $(legendBox).css({"background": color});
    //$(legendBox).text("&emsp;&emsp;");
    let legendText = document.createElement("TD");
    if (i > 0) {
      $(legendText).text(htmlDecode("&emsp;") + (tMin+(i-1)*interval).toFixed(1) + htmlDecode("&ndash;") + (tMin+i*interval).toFixed(1) + " °C");
    } else {
      $(legendText).text(htmlDecode("&emsp;No data"));
    }
    let tr = $('<tr></tr>');
    $(tr).append(legendBox);
    //$(tr).append(legendBox);
    $(tr).append(legendText);
    $(tbody).append(tr);
    /*return new Cesium.Color(0.2, 0.5, 0.7, 0.6);
  } else if (t < (tMin + interval * 2)) {
    return new Cesium.Color(0.3, 0.5, 0.5, 0.6);
  } else if (t < (tMin + interval * 3)) {
    return new Cesium.Color(0.7, 0.5, 0.2, 0.6);
  } else {
    return new Cesium.Color(0.9, 0.3, 0.1, 0.6);
  }*/
  }
}

/**
* via https://plnkr.co/edit/lm290uaQewEvfIOgXbDP?p=preview
*/
function addTimeVariableColor(entities) {
  //console.log(entities);
  entities.forEach(entity => {
    let cbP = new Cesium.CallbackProperty(temperatureCallback.bind(entity), false);
    entity.model.color = cbP;
  });
  return "random callback";
}

/**
*/
function loadZones(zones) {
  let czml = [{
    "id" : "document",
    "name" : "CZML Model",
    "version" : "1.0"
  }];

  let dataSource = new Cesium.CzmlDataSource();
  dataSource.load(czml);
  viewer.dataSources.add(dataSource);

  return new Promise((resolve, reject) => {
    resolve(Promise.all(
      zones.map((zone) => {
        return generateCzmlItem(zone.name).then(czmlItem => {
            //console.log(czmlItem);
          return dataSource.process(czmlItem);
        }).catch(err => console.log("inall:", err));
      })
      ).then((res) => {
        //console.log("res", res)
        return dataSource;
      }).catch(err => console.log("outall:", err))
    );}
  );
}
