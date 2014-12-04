
var dropkick = require('dropkick');


dropkick(document.body)
  .on('file', function(file) {
    ndnFunc.shareFile(file)
  })


window.handle = prompt("choose a handle: ")
window.roomName = prompt("enter room name: ")


//window.ndnFunc = require("../src.js")

var input = document.getElementById("chatInput")
input.addEventListener("keydown", function(e) {
    if (!e) { var e = window.event; }
    if (e.keyCode == 13) { ndnFunc.chat(input.value); input.value = ""; }
}, false)



var makeSaveButton = function(fileName, file){
  var a = document.createElement("a")
  a.download = fileName;
  a.innerText = "save"
  a.href = URL.createObjectURL(file);
  console.log(a, file, fileName)
  //put link somewhere
}

var makeDownloadButton = function(fileName){
  var button = document.createElement("button")
  button.innerText = "download"
  button.onclick = function(){
    ndnFunc.getFile(fileName, function(err,file){
      console.log("file fetched", fileName, file)
      makeSaveButton(fileName, file)
    })
  }
  //put button somewhere
}

var displayMessage = function(msg){
  var line = document.createElement("p")
  line.innerText = msg.handle + " : " + msg.message + "  ";
  document.getElementById("output").insertBefore(line, document.getElementById("output").firstChild)

}

document.getElementById("startChatButton").onclick = function(){


  ndnFunc.joinRoom(roomName, makeDownloadButton, displayMessage)
}

setTimeout(function(){
}, 200)
