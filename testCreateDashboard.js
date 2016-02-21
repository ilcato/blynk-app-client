var blynk = require("./index.js").createClient("127.0.0.1", 8443);
blynk.connect("xxx", "xxx")
	.then(function (status) {
		return blynk.deleteDashboard(101);	
	})
	.then(function (status) {
		return blynk.createDashboard(101, "DashTest");	
	})
	.then(function (status) {
		return blynk.createWidget(101, 1, 0, 0, "Button", "BUTTON", "DIGITAL", "5");	
	})
	.then(function (status) {
		return blynk.createWidget(101, 2, 200, 200, "Display", "DIGIT4_DISPLAY", "DIGITAL", "4");	
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
