# blynk-app-client
Node.js module for accessing Blynk server through the App interface

# Usage

Creating a Dashboard programmatically:

```javascript
var blynk = require("blynk-app-client").createClient("127.0.0.1", 8443);
blynk.connect("USERNAME", "PASSWORD")
	.then(function (status) {
		return blynk.deleteDashboard(101);	
	})
	.then(function (status) {
		return blynk.createDashboard(101, "DashTest", "ESP8266");	
	})
	.then(function (status) {
		return blynk.createWidget(101, 1, 0, 0, "Button", "BUTTON", "DIGITAL", "5");	
	})
	.then(function (status) {
		return blynk.createWidget(101, 2, 1, 0, "Display", "DIGIT4_DISPLAY", "DIGITAL", "4");	
	})
	.then(function (status) {
		return blynk.getToken(101);
	})
	.then(function (token) {
		console.log("Token: " + token);
		process.exit();
	})
	.catch(function (error) {
		console.log("Error: " + error);
		process.exit();
	});
```

Reading and writing pins (after configuring hardware with the previous token):

```javascript
var blynk = require("blynk-app-client").createClient("127.0.0.1", 8443);
blynk.connect("USERNAME", "PASSWORD")
	.then(function (status) {
		return blynk.activate(101);
	})
	.then(function (status) {
		return blynk.hardware(101, "d", "r", 4);
	})
	.then(function(fields) {
		var dasBoardId = parseInt(fields[0]);
		var pinCommand = fields[1];
		var pin = fields[2];
		var pinValue = fields[3];
		console.log("Hardware response:");
		console.log("\t dashBoardId: " + dasBoardId);
		console.log("\t pinCommand: " + pinCommand);
		console.log("\t pin: " + pin);
		console.log("\t pinValue: " + pinValue);
		return blynk.hardware(101, "d", "w", 5, 0);
	})
	.then(function(status) {
		console.log("Hardware response: " + status);
		process.exit();
	})
	.catch(function (error) {
		console.log("Error: " + error);
		process.exit();
	});
```

Reading profile:

```javascript
var blynk = require("blynk-app-client").createClient("127.0.0.1", 8443);
blynk.connect("USERNAME", "PASSWORD")
	.then(function (status) {
		return blynk.loadProfileGzipped();	
//		return blynk.loadProfileGzipped(101);	// for getting only dashboard 101
	})
	.then(function (data) {
		console.log("Data: " + data)
		process.exit();
	})
	.catch(function (error) {
		console.log("Error: " + error);
		process.exit();
	});
```