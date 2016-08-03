'use strict';
var selfEasyrtcid = "";
var width = 320;   
var height = 0;     

var streaming = false;
var video = null;
var canvas = null;
var photo = null;
var startbutton = null;
var timeout =1500;

// Set up auth
var isAuthorized = false;
var userName = null; 

//Function that gets called when page loads

function startup() {

    video = document.getElementById('selfVideo');
    canvas = document.getElementById('canvas');
    startbutton = document.getElementById('capturebutton');
    navigator.getMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);
   		 navigator.getMedia(
            {
                video: true,
                audio: false
            },
    function (stream) {
        if (navigator.mozGetUserMedia) {
            video.mozSrcObject = stream;
        } else {
            var vendorURL = window.URL || window.webkitURL;
            video.src = vendorURL.createObjectURL(stream);
        }
        video.play();
        
    },function (err) {
                console.log("An error occured! " + err); }
    );
    video.addEventListener('canplay', function (ev) {
        if (!streaming) {
            height = video.videoHeight / (video.videoWidth / width);
            
         
            if (isNaN(height)) {
                height = width / (4 / 3);
            }
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;            
        }
    }, false);
    startbutton.addEventListener('click', function (ev) {
            ShowProgressAnimation();
        takepicture();
        //detect();
        ev.preventDefault();
    }, false);
}

function connect() {
   if(window.localStorage.getItem("userName")== null){
	    window.location.href= 'https://webrtcfacerecognition.herokuapp.com/';
    }
    easyrtc.setVideoDims(640, 480);
    easyrtc.easyApp("easyrtc.audioVideoSimple", "selfVideo", ["callerVideo"], loginSuccess, loginFailure);
    easyrtc.setUsername(window.localStorage.getItem('userName'));    
}

// Capture a photo by fetching the current contents of the video
// and drawing it into a canvas, then converting that to a PNG
// format data URL.

function takepicture() {
    var context = canvas.getContext('2d');
     userName = window.localStorage.getItem('userName');
       console.log(userName);
    if (width && height) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        var data = canvas.toDataURL('image/png');
        canvas.style.display = "none";
        var xhttp = new XMLHttpRequest();
		xhttp.timeout = 2000; // time in milliseconds
		xhttp.ontimeout = function (e) {
 		 // XMLHttpRequest timed out. Do something here.
		};
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                  console.log("Success"+xhttp.responseText);
                 sendUserName(userName);
        	}
        };
        xhttp.open("POST","recieve", true);
         xhttp.send(data+"user"+userName);
    }    

      
}

function  sendUserName(name)
{
  var xhttps = new XMLHttpRequest();
        xhttps.timeout = 5000; // time in milliseconds
		xhttps.ontimeout = function (e) {
 		 // XMLHttpRequest timed out. Do something here.
		};
 		 xhttps.onreadystatechange = function () {
		if (xhttps.readyState == 4 && xhttps.status == 200) {
            console.log("Success"+xhttps.responseText);

    	  readVerificationResponse(xhttps.responseText);
    	}   	
     };         
        xhttps.open("POST","sendusername", true);
        xhttps.send(name);    
}

// Function to read the response from the server
function readVerificationResponse(string)
{
  console.log("Response: "+ string);
   var obj = $.parseJSON(string);
   
	if(obj.isIdentical)
	{
	 HideProgressAnimation();
	  //display message to user and navigate to conference page

	 window.alert("Welcome to video conference.");

       window.location.href= 'https://webrtcfacerecognition.herokuapp.com/conference.html';
    }
     else {
     HideProgressAnimation();
 //display message to user and navigate to main page
	window.alert("Sorry!You are not authorized for video conference.")
	
   	window.location.href= 'https://webrtcfacerecognition.herokuapp.com/';
  }
  	
}
//Showing the spinner image as feedback to user
function ShowProgressAnimation() { 
$("#loading-div-background").css({ opacity: 0.8 });          
       
$("#loading-div-background").show();
}

//Hide the spinner 
function HideProgressAnimation() { 
$("#loading-div-background").hide();
}

//Function that gets called when successful login
function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;
   var a=  window.localStorage.getItem("userName");
    if (a != null) {
        document.getElementById("iam").innerHTML = "I am " + easyrtc.username;
    }else{
    }
}
//Function to clear local storage

function clearLocalStorage() {
  localStorage.removeItem("userName");

  return '';
};
//Function that gets called when login fails

function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}


// Set up our event listener to run the startup process
window.addEventListener('load', startup, false);