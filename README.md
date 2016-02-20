# blynk-app-client
Node.js module for accessing Blynk server through the App interface

FIRST DRAFT

# Use

	var blynk = require("blynk-app-client").createClient("127.0.0.1", 8443);
	blynk.connect("username", "password")
	.then(function (status) {
		return blynk.hardware("923968099", "d", "r", 4);
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
		return blynk.hardware("923968099", "d", "w", 5, 0);
	})
	.then(function(status) {
		console.log("Hardware response: " + status);
	})
	.catch(function (error) {
		console.log("Error: " + error);
	});


