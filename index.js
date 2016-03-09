// Blynk app client
// The module offers a Node.js interface to the Blynk server app API on the SSL port
// It allows to execute the same commands as the the Blynk app 
// It works only on private servers (not with the Blynk cloud server because it requires
// an SSL client authentication).
//

'use strict';

const tls = require('tls');
const zlib = require('zlib');
const crypto = require('crypto');
const SEND_TIMEOUT = 10000;

function BlynkAppClient(host, port) {
	this.host = host;
	this.port = port;
	this.msgId = 1;
	this.respPromises = new Map();
}

BlynkAppClient.prototype.connect = function(username, password) {
	this.options = {
  		rejectUnauthorized: false
	};
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.socket = tls.connect(this.port, this.host, this.options, () => {
				this.send("login " + username + " " + password);
			}.bind(this)
		);
		this.respPromises.get(msgId).timeout = setTimeout(function () {
			reject("connect timeout");
		}
		, SEND_TIMEOUT);

	}.bind(this));
	this.socket.on('data', function(data) {
		var msgId = data.readUInt16BE(1);
		var r =	this.respPromises.get(msgId);
		switch (data[0]) {
			case MsgType.RESPONSE:
				var responseCode = data.readUInt16BE(3);
				r.resolve(responseCode);
				clearTimeout(r.timeout);
				break;
			case MsgType.HARDWARE:
				if (r != undefined) {
					var resp = data.toString('utf8', 5);
					var fields = resp.split('\0');
					r.resolve(fields);
					clearTimeout(r.timeout);
					this.respPromises.delete(msgId);
				}
				break;
			case MsgType.GET_TOKEN:
				if (r != undefined) {
					var resp = data.toString('utf8', 5);
					r.resolve(resp);
					clearTimeout(r.timeout);
				}
				break;
			case MsgType.LOAD_PROFILE_GZIPPED:
				if (r != undefined) {
					var buf = new Buffer(data.length - 5);
					data.copy(buf, 0, 5);
					zlib.unzip(buf, (err, buffer) => {
						  if (!err) {
							var resp = buffer.toString('utf8');
							r.resolve(resp);
						  } else {
							r.reject(err);
						  }
					});
					clearTimeout(r.timeout);
				}
				break;
			case MsgType.SYNC:
				break;
			default:
				console.log("Response raw data: " + data);
				break;
		}
	}.bind(this));
	this.socket.on('end', function() {
		;
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.deleteDashboard = function(dashboardId) {
	var command = "deleteDash " + dashboardId;
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.send(command);
		this.respPromises.get(msgId).timeout = setTimeout(function () {
			reject("deleteDashboard timeout");
		}
		, SEND_TIMEOUT);
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.createDashboard = function(dashboardId, name, type) {
	var command = "createDash {\"id\": " + dashboardId + ",  \"name\": \"" + name + "\"" + ", \"boardType\": \"" + type + "\"}";
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.send(command);
		this.get(msgId).timeout = setTimeout(function () {
			reject("createDashboard timeout");
		}
		, SEND_TIMEOUT);
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.createWidget = function(dashboardId, widgetId, x, y, label, widgetType, pinType, pin) {
	var command = 	"createWidget " + dashboardId +
					"\0{\"id\":" + widgetId +
					", \"x\":" + x +
					", \"y\":" + y + 
					", \"label\":\"" + label +
					"\", \"type\":\"" + widgetType +
					"\", \"pinType\":\"" + pinType +
					"\", \"pin\":" + pin +
					", \"frequency\":1" +
					"}";

	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.send(command);
		this.respPromises.get(msgId).timeout = setTimeout(function () {
			reject("createWidget timeout");
		}
		, SEND_TIMEOUT);
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.getToken = function(dashboardId) {
	var command = "getToken " + dashboardId;
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.send(command);
		this.respPromises.get(msgId).timeout = setTimeout(function () {
			reject("getToken timeout");
		}
		, SEND_TIMEOUT);
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.activate = function(dashboardId) {
	var command = "activate " + dashboardId;
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.send(command);
		this.respPromises.get(msgId).timeout = setTimeout(function () {
			reject("activate timeout");
		}
		, SEND_TIMEOUT);
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.hardware = function(dashboardId, pinType, pinCommand, pinId, pinValue) {
	var command = "hardware " + dashboardId + " " + pinType + pinCommand + " " + pinId;
	if (pinValue != undefined)
		command = command + " " + pinValue;
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject,
			"command": command
		});
		this.send(command);
		if (pinCommand == "w")
			resolve("done");
		else {
			this.respPromises.get(msgId).timeout = setTimeout(function () {
				reject("Hardware timeout: " + pinType+pinCommand + pinId + (pinValue != undefined ? pinValue : ""));
			}
			, SEND_TIMEOUT);
		}
	}.bind(this));
	return p;
}
BlynkAppClient.prototype.loadProfileGzipped = function(dashboardId) {
	var command = "loadprofilegzipped";
	if (dashboardId != undefined)
		command = command + " " + dashboardId;
	var p = new Promise(function(resolve, reject) {
		var msgId = this.msgId;
		this.respPromises.set(msgId, {
			"resolve": resolve,
			"reject": reject
		});
		this.send(command);
		this.respPromises.get(msgId).timeout = setTimeout(function () {
			reject("loadProfileGzipped timeout");
		}
		, SEND_TIMEOUT);
	}.bind(this));
	return p;
}

BlynkAppClient.prototype.close = function() {
}

BlynkAppClient.prototype.send = function(data) {
	if (!this.socket) {
		return;
	}
	var commandAndBody = data.split(" ");
	var message = this.createMessage(commandAndBody);
	this.socket.write(message);
}


BlynkAppClient.prototype.createMessage = function(commandAndBody) {
	var cmdBody = null;
	var cmdString = commandAndBody[0];
	var cmd = getCommandByString(cmdString);
	if (cmd == MsgType.LOGIN) {
		var username = commandAndBody[1];
		var pwd = commandAndBody[2];
		var hUser = crypto.createHash('sha256');
		var hPwd = crypto.createHash('sha256');
		var salt = hUser.update(username.toLowerCase()).digest();
		hPwd.update(pwd, "utf8");
		hPwd.update(salt, "utf8");			
		var finalHash = hPwd.digest('base64');			
		cmdBody = username + "\0" + finalHash;
	} else if (cmd == MsgType.CREATE_DASH || cmd == MsgType.CREATE_WIDGET) {
		cmdBody = commandAndBody.length > 1 ? commandAndBody.slice(1).join(' ') : null;
	} else{       
		cmdBody = commandAndBody.length > 1 ? commandAndBody.slice(1).join('\0') : null;
	}
	return this.buildBlynkMessage(cmd, this.msgId++, cmdBody);
}

BlynkAppClient.prototype.buildBlynkMessage = function(cmd, msgId, cmdBody) {
	const BLYNK_HEADER_SIZE = 5;
	var bodyLength = (cmdBody ? cmdBody.length : 0);

	var bufArray = new ArrayBuffer(BLYNK_HEADER_SIZE + bodyLength);
	var dataview = new DataView(bufArray);
	dataview.setInt8(0, cmd);
	dataview.setInt16(1, msgId);
	dataview.setInt16(3, bodyLength);

	if (bodyLength > 0) {
		//todo optimize. should be better way
		var buf = new ArrayBuffer(bodyLength); // 2 bytes for each char
		var bufView = new Uint8Array(buf);
		for (var i = 0, offset =  5; i < cmdBody.length; i++, offset += 1) {
			dataview.setInt8(offset, cmdBody.charCodeAt(i));
		}
	}

	return new Buffer(bufArray);
}
var MsgType = {
    RESPONSE      		:  0,
    LOGIN         		:  2,
	GET_TOKEN			:  5,
    PING          		:  6,
    ACTIVATE_DASHBOARD	:  7,
    TWEET         		:  12,
    EMAIL         		:  13,
    NOTIFY        		:  14,
    BRIDGE        		:  15,
    HW_SYNC       		:  16,
    HW_INFO       		:  17,
    HARDWARE      		:  20,
    LOAD_PROFILE_GZIPPED:  24,
 	SYNC				:  25,
	CREATE_DASH			:  21,
	DELETE_DASH 		:  23,
	CREATE_WIDGET		:  33
};

var MsgStatus = {
    OK                    :  200,
    USER_NOT_REGISTERED	  :  3,
    ILLEGAL_COMMAND       :  2,
    NOT_ALLOWED			  :	 6,
    NO_ACTIVE_DASHBOARD   :  8,
    INVALID_TOKEN         :  9,
    ILLEGAL_COMMAND_BODY  :  11,
    DEVICE_WENT_OFFLINE   :  18
};

function getCommandByString(cmdString) {
    switch (cmdString) {
        case "ping" :
            return MsgType.PING;
        case "login" :
            return MsgType.LOGIN;
		case "getToken" :
			return MsgType.GET_TOKEN;
        case "createDash":
        	return MsgType.CREATE_DASH;
        case "deleteDash":
        	return MsgType.DELETE_DASH;
        case "activate":
        	return MsgType.ACTIVATE_DASHBOARD;
        case "createWidget":
        	return MsgType.CREATE_WIDGET;
        case "hardware" :
            return MsgType.HARDWARE;
        case "loadprofilegzipped" :
        	return MsgType.LOAD_PROFILE_GZIPPED;
    }
}

function getStringByCommandCode(cmd) {
    switch (cmd) {
        case 0 :
            return "RESPONSE";
        case 20 :
            return "HARDWARE";
    }
}

function getStatusByCode(statusCode) {
    switch (statusCode) {
        case 200 :
            return "OK";
        case 2 :
            return "ILLEGAL_COMMAND";
		case 3 :
			return "USER_NOT_REGISTERED";
		case 6 :
			return "NOT_ALLOWED";
        case 8 :
            return "NO_ACTIVE_DASHBOARD";
        case 9 :
            return "INVALID_TOKEN";
        case 11 :
            return "ILLEGAL_COMMAND_BODY";
        case 18 :
        	return "DEVICE_WENT_OFFLINE";
    }
}

module.exports.createClient = function(host, port) {
	return new BlynkAppClient(host, port);
}

