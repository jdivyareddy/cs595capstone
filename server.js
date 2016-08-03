// Load required modules
var http = require("http"); 
var https = require("https");
var request = require('request');      // http server core module
var express = require("express"); // web framework external module
var io = require('socket.io');  // web socket external module
var easyrtc = require("easyrtc");  // EasyRTC external module
var fs = require('fs');

const aws = require('aws-sdk');

var count =0;
var userName = null; 
var faceIdForIdImage = null; //faceId returned by faceDetect of original image  saved in s3 
var faceIdForCapuredImage = null; //faceId returned by faceDetect of image captured from video

 var IDImageUrl, capturedImageUrl;//Url of original image  and captured image saved in s3 
var base64Data;
var isAuthorized;

// Setup and configure Express http server.
var httpApp = express();

httpApp.use(function(req, res, next){
   var data = "";
   req.on('data', function(chunk){ data += chunk})
   req.on('end', function(){
      req.rawBody = data;
      next();
   })
});

//receive the captured  image data from client 
httpApp.post('/recieve',function(req, res, next)
{
 base64Data = req.rawBody.replace(/^data:image\/png;base64,/, "");
 var imageData = base64Data.split("user");
  console.log("Name Data"+imageData[1]);
 var name = imageData[1].toLowerCase();
 count = count+1;

 var image = 'capturedimages/'+name+count+'.jpg'; 
 var uploader = require('base64-string-s3');

var options = {
    key: 'XXX', //amazon access key
    secret: 'XXX',//amazon secret access key
    bucket: 'webrtcbucket',//amazon s3 bucket
    chunkSize: 512 
}
uploadImageToS3(image);

//uploading base64Data to amazon s3 bucket using base64-string-s3
function uploadImageToS3(){
var uploadimage = new uploader(options);

// put arguments: base64 string, object key, mime type, permissions 
uploadimage.put(imageData[0], image, 'image/jpeg', 'public-read');
uploadimage.on('response', function (data) {
    console.log('Uploaded Succesfully', data);
    
  res.send(data);

}); 
uploadimage.on('error', function (err) {
    console.error("S3 Error"+err);
});
 
uploadimage.on('close', function () {
    console.log('closed connection');
});
}

});

//receive username from client and pass it to the face API
httpApp.post('/sendusername',function(req, res, next)
{
var name = req.rawBody;

//read the urls from s3 bucket
      IDImageUrl = "https://s3-us-west-2.amazonaws.com/webrtcbucket/originalimages/" +name.toLowerCase() + ".jpg";
	 capturedImageUrl = "https://s3-us-west-2.amazonaws.com/webrtcbucket/capturedimages/"+ name.toLowerCase() + count+".jpg";
     
 detect(IDImageUrl);
 
 //Detect original face and return faceid1
function detect(IDImageUrl)
{
var url = "{'url': '" + IDImageUrl + "'}";
	var body = url;
	
	console.log("IDImage"+body);
	
	var headers = {
    'Content-Type':'application/json',
    'Content-Length': Buffer.byteLength(body)
    }
    var options = {
            host: 'api.projectoxford.ai',
            method: 'POST',
            path: '/face/v1.0/detect?subscription-key=9a6dadcce1654a3d88f710da9658d9a2',
            headers: headers  
     };
    callback = function(response) 
    {
  		response.on('data', function (chunk) 
  		{
    	 console.log("Response Face ID: "+chunk.toString());
	     var chunk = chunk.toString();
    	     var url = chunk.split(','); 
    	     	var newimg = url[0].toString().split(':');

        faceIdForIdImage= newimg[1];
        
        //api call to detect captured image 
        detectCapturedImage(capturedImageUrl);

  		});
		response.on('end', function () {
    	console.log("end");
  		});
  		response.on('error', function(err) {
    	// Handle error
   	 	console.log('API Error'+ err);    
    	});
	 }
	var req = https.request(options, callback);
	req.on('error', function(e) 
	{
    console.log('problem with request: ' + e.message);
	});
	req.end(body);
}
 //Detect captured image face and return faceid2

function detectCapturedImage(capturedImageUrl)
{
var url =  "{'url': '" + capturedImageUrl + "'}" ;
	var body = url;
	console.log("CaptureImage"+body);
	
	var headers = {
    'Content-Type':'application/json',
    'Content-Length': Buffer.byteLength(body)
    }
    var options = {
            host: 'api.projectoxford.ai',
            method: 'POST',
            path: '/face/v1.0/detect?subscription-key=9a6dadcce1654a3d88f710da9658d9a2',
            headers: headers  
     };
    callback = function(response) 
    {
  		response.on('data', function (chunk) 
  		{
  		var chunk = chunk.toString();
  		var url = chunk.split(','); 
    	var newimg = url[0].toString().split(':');
    	var faceRect = url.toString();
    	faceIdForCapuredImage = newimg[1];
    	console.log("Captured Face ID:"+faceIdForCapuredImage);
    	 verifyFaces(faceIdForIdImage, faceIdForCapuredImage);   
  		});
		response.on('end', function () {
    	console.log("end");
  		});
  		response.on('error', function(err) {
    	// Handle error
   	 	console.log('API Error'+ err);    
    	});
	 }
	var req = https.request(options, callback);
	req.on('error', function(e) 
	{
    console.log('problem with request: ' + e.message);
	});
	req.end(body);
}

 //verify faces  and return identical =true/false

function verifyFaces(faceIdForIdImage, faceIdForCapuredImage)
{
var data = "{'faceId1':" + faceIdForIdImage +",'faceId2':"+ faceIdForCapuredImage + "}";
	var body = data;
	   	 	//console.log('Body'+ body);    
	var headers = {
    'Content-Type':'application/json',
    'Content-Length': Buffer.byteLength(body)
    }
    var options = {
            host: 'api.projectoxford.ai',
            method: 'POST',
            path: '/face/v1.0/verify?subscription-key=9a6dadcce1654a3d88f710da9658d9a2',
            headers: headers  
     };
    callback = function(response) 
    {
  	 	response.on('data', function (chunk) 
  		{
			console.log("Chunk: "+chunk.toString());     
    		res.send(chunk.toString());
  		});
		response.on('end', function () {
    	console.log("end");   
  		});
  		response.on('error', function(err) {
    	// Handle error
    	console.log('API Error'+ err);
    	});
	}    
	var req = https.request(options, callback);
	req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
	});
	req.timeout = 2000; // time in milliseconds
	req.ontimeout = function (e) {
 		 // XMLHttpRequest timed out. Do something here.
	};
	req.end(body);
}
});

//scripts directory
httpApp.use(express.static(__dirname + '/scripts'));
httpApp.get('/',function(req,res){
      res.sendFile(__dirname + "/index.html");
});

// Authentication page
httpApp.use(function(request, response, next) {
  if (request.url == "/authentication.html") {
    response.sendFile(__dirname + "/authentication.html");
    
  } else {
    next();
  }
});

//Conference page
httpApp.use(function(request, response, next) {
  if (request.url == "/conference.html") {
    response.sendFile(__dirname + "/conference.html");
    
  } else {
    next();
  }
});

// Start Express http server on port 3000
var webServer = http.createServer(httpApp).listen(process.env.PORT || 3000);

 // Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {"log level":1});
easyrtc.setOption("logLevel", "debug");
// Start EasyRTC server

var rtc = easyrtc.listen(httpApp, socketServer, null, function(err, rtcRef) {
console.log("Initiated");
});

