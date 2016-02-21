// Blynk app client
// The module offers a Node.js interface to the Blynk server app API on the SSL port
// It allows to execute the same commands as the the Blynk app 
// It works only on private servers (not with the Blynk cloud server because it requires
// an SSL client authentication).
//

'use strict';

const tls = require('tls');
const fs = require('fs');
const crypto = require('crypto');
const SEND_TIMEOUT = 10000;

function BlynkAppClient(host, port) {
	this.host = host;
	this.port = port;
	this.msgId = 1;
}

BlynkAppClient.prototype.connect = function(username, password) {
	this.options = {
  		rejectUnauthorized: false
	};
	var that = this;
	var p = new Promise(function(resolve, reject) {
		that.resolveConnect = resolve;
		that.rejectConnect = reject;
		that.msgIdConnect = that.msgId;
		that.socket = tls.connect(that.port, that.host, that.options, () => {
				that.send("login " + username + " " + password);
			}
		);
	});
	this.socket.on('data', function(data) {
		var msgId = data.readUInt16BE(1);
		switch (data[0]) {
			case MsgType.RESPONSE:
				var responseCode = data.readUInt16BE(3);
				if (msgId == this.msgIdConnect) {
					if (responseCode == MsgStatus.OK) {
						this.resolveConnect(MsgStatus.OK);
					} else {
						this.rejectConnect(responseCode);
					}
				} else if (msgId == this.msgIdCreateDash) {
					if (responseCode == MsgStatus.OK) {
						this.resolveCreateDash(MsgStatus.OK);
					} else {
						this.rejectCreateDash(responseCode);
					}
					clearTimeout(this.createDashTimeout);
				} else if (msgId == this.msgIdHardware) {
					this.rejectHardware(responseCode);
					clearTimeout(this.hardwareTimeout);
				}
				break;
			case MsgType.HARDWARE:
				var resp = data.toString('utf8', 5);
				var fields = resp.split('\0');
				if (msgId == this.msgIdHardware) {
					this.resolveHardware(fields);
				} else {
					this.rejectHardware("Wrong msgId");
				}
				clearTimeout(this.hardwareTimeout);
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

BlynkAppClient.prototype.createDashboard = function(dashboardId, name) {
	var command = "createDash {\"id\": " + dashboardId + ",  \"name\": \"" + name + "\" }";
	var that = this;
	var p = new Promise(function(resolve, reject) {
		that.resolveCreateDash = resolve;
		that.rejectCreateDash = reject;
		that.msgIdCreateDash = that.msgId;
		that.send(command);
		that.createDashTimeout = setTimeout(function () {
			reject("createDashboard timeout");
		}
		, SEND_TIMEOUT);
	});
	return p;
}
BlynkAppClient.prototype.hardware = function(dashboardId, pinType, pinCommand, pinId, pinValue) {
	var command = "hardware " + dashboardId + " " + pinType + pinCommand + " " + pinId;
	if (pinValue != undefined)
		command = command + " " + pinValue;
	var that = this;
	var p = new Promise(function(resolve, reject) {
		that.resolveHardware = resolve;
		that.rejectHardware = reject;
		that.msgIdHardware = that.msgId;
		that.send(command);
		if (pinCommand == "w")
			resolve("done");
		else {
			that.hardwareTimeout = setTimeout(function () {
				reject("Hardware timeout");
			}
			, SEND_TIMEOUT);
		}
	});
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
	} else {       
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
    PING          		:  6,
    ACTIVATE_DASHBOARD	: 7,
    TWEET         		:  12,
    EMAIL         		:  13,
    NOTIFY        		:  14,
    BRIDGE        		:  15,
    HW_SYNC       		:  16,
    HW_INFO       		:  17,
    HARDWARE      		:  20
    
};

var MsgStatus = {
    OK                    :  200,
    USER_NOT_REGISTERED	  :  3,
    ILLEGAL_COMMAND       :  2,
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
        case "activate":
        	return MsgType.ACTIVATE_DASHBOARD;
        case "hardware" :
            return MsgType.HARDWARE;
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

