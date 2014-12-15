
var gremlin = require("ndn-gremlin")
var dropkick = require('dropkick');
var IO = require("ndn-io");
require("setimmediate")

window.Buffer = Buffer;
exports.onHandleChosen = function(handle, chatListEl){
  window.io = new IO(new gremlin(),{}, function onIOReady(){
    io.gremlin.addConnection("ws://"+ location.hostname, function(id){
      window.hostID = id;
      var askForRoomInferests = new io.gremlin.ndn.Interest(new io.gremlin.ndn.Name(["?", "@", handle]))
      io.gremlin.addRegisteredPrefix("?/", id)
                .addRegisteredPrefix("%/", id)
                .registerPrefix("@/"+ handle + "/%", id)
                .addListener({prefix:"@/"+ handle + "/%", blocking:true}, function(interest, faceID){
                  console.log("got inferest for room")
                  var chatName = interest.name.get(-1).toEscapedString()

                  var chatEl = $("<li><a href='#chatPage' data-channel-name='" + chatName + "'>"
                        + chatName
                        + "</a><a href='#delete' data-rel='dialog' data-channel-name='" + chatName + "'></a></li>");
                  chatListEl.append(chatEl);
                })
                .handleInterest(askForRoomInferests.wireEncode().buffer, function(){}, true);
    })
  })
}
/*
  /! - announcement prefix




*/


exports.createRoom = function(roomName, onFileAnnounce, onMessage, userList){
  window.onMessage = onMessage;
  window.roomName = roomName;
  window.chatRoom = io.createNamespace("@/"+roomName + "/" + handle, function onChatPubliherReady(err, data){
    console.log(err, data);

    window.sequence = 0;

    chatRoom.publisher.serve("@/" + roomName + "/user/" + handle);
    chatRoom.fetcher.setType("json")
                    .setInterestLifetimeMilliseconds(1000)

  })
  window.hostFace = 0;
  window.filebox = io.createNamespace("#/" + roomName, function(){
    console.log("filebox ready")
    filebox.publisher.serve("#/" + roomName)
  })



  io.gremlin.addConnectionListener("%/" + roomName + "/connect" , 100, function onNewMember(err, id){
    console.log("got new connection", err, id)
    io.gremlin.addRegisteredPrefix("!/", id)
              .addRegisteredPrefix("@/"+ roomName, id)

  }, function onMemberLeave(){
    console.log("connection lost")
  })
  .addListener("!/@", function(interest, faceID){

      console.log("got chat announce", interest.toUri())
    var chatName = interest.name.getSubName(1);
    console.log(chatName.toUri());
    chatRoom.fetcher.setName(chatName)
                    .get(function(err, message){
                      if (!err){
                        onMessage(message);
                      }
                    });
  })
  .addListener("!/#", function(interest, faceID){
    var slug = interest.name.get(3).toEscapedString();
    var extension = interest.name.get(4).toEscapedString();
    if (typeof faceID === "number"){
      io.gremlin.addRegisteredPrefix(interest.name.getSubName(1), faceID);
    }
    onFileAnnounce(slug, extension);
  })
  .addListener({prefix: "?/", blocking:true}, function(interest, faceID, unblock){
    console.log("got interest for inferest")
    var roomAnnounceName = interest.name.getSubName(1).append("%").append(roomName)
    console.log("r", roomAnnounceName.toUri())
    var roomInferest = new io.gremlin.ndn.Interest(roomAnnounceName)

    io.gremlin.addRegisteredPrefix(roomAnnounceName.toUri(), 0);

    io.gremlin.handleInterest(roomInferest.wireEncode().buffer, function(){}, true)
  })
  .registerPrefix("%/"+ roomName, 0)
  .registerPrefix("?/", 0)

}

exports.joinRoom = function(roomName, onFileAnnounce, onMessage, userList){
  window.onMessage = onMessage;
  window.roomName = roomName
  window.chatRoom = io.createNamespace("@/"+roomName + "/" + handle, function onChatPubliherReady(err, data){
    console.log(err, data);

    window.sequence = 0;

    chatRoom.publisher.serve("@/" + roomName + "/user/" + handle);
    chatRoom.fetcher.setType("json")
                    .setInterestLifetimeMilliseconds(1000)

  })

  window.filebox = io.createNamespace("#/" + roomName, function(){
    console.log("filebox ready")
    filebox.publisher.serve("#/" + roomName)
  })

  filebox.publisher.serve()

  io.gremlin.requestConnection("%/"+roomName + "/connect", function onConnectedToRoom(err, id){
    console.log("connection?", id)
    window.hostFace = id;
    io.gremlin.registerPrefix("@/"+roomName + "/user/"+ handle, id)
              .addRegisteredPrefix("!", id)
              .addRegisteredPrefix("@/"+ roomName, id)
              .addRegisteredPrefix("#/"+ roomName, id)
  })
  .addListener({prefix: "!/@", blocking:true}, function(interest, faceID){
    console.log("got chat announce", interest.toUri())
    var chatName = interest.name.getSubName(1);
    chatRoom.fetcher.setName(chatName)
                    .get(function(err, message){

                      if (!err){
                        console.log();
                        onMessage(message);
                      }
                    });

  })
  .addListener({prefix: "!/#", blocking:true}, function(interest, faceID, unblock){
    console.log("got file announce")
    var slug = interest.name.get(3).toEscapedString();
    var extension = interest.name.get(4).toEscapedString();
    if (typeof faceID === "number"){
      io.gremlin.addRegisteredPrefix(interest.name.getSubName(1), faceID);
    } else {
      unblock();
    }
    onFileAnnounce(slug, extension);
  })
};

exports.leaveRoom = function(){
  var announcementName = new io.gremlin.ndn.Name(["!" , roomName, "0", handle]);
  var announcement = new io.gremlin.ndn.Interest(announcementName.append(filebox.publisher.name));
}

exports.shareFile = function(file){
  var extension = file.name.substr(file.name.indexOf(".") + 1);
  var slug = file.name.substr(0, file.name.indexOf(".")).toLowerCase().replace(/-+/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  var prefix = new io.gremlin.ndn.Name(["#",roomName, slug, extension ])
  filebox.publisher
         .setName(prefix)
         .setToPublish(file)
         .setFreshnessMilliseconds(60 * 60 * 1000)
         .publish(function(err, data){

  })

  var announcementName = new io.gremlin.ndn.Name(["!"]);
  var announcement = new io.gremlin.ndn.Interest(announcementName.append(filebox.publisher.name));
  io.gremlin.registerPrefix(prefix, hostFace)
            .handleInterest(announcement.wireEncode().buffer,function(){console.log("hey you, file announced")});
}

exports.getFile = function(slug, extension, callback){
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!filename", filebox.prefix.toUri())
  var t1 = Date.now();
  filebox.fetcher.setType("file")
                 .setName("#/" + roomName +"/"+ slug +"/"+ extension)
                 .setInterestLifetimeMilliseconds(4000)
                 .get(function(err, data){
                   console.log("file fetch callback", err, data, data.size / (Date.now() - t1));
                   callback(err, data)
                 })//" + roomName + "/" + fileName, function(err, file){
    //console.log("got file?", err, file)
}
window.Buffer  = Buffer
exports.chat = function(message){
  var name = new io.gremlin.ndn.Name(["@",roomName,"user", handle]);
  console.log(name)
  var message = {
    handle: window.handle
    , message: message
    , id : Date.now()
  }
  chatRoom.publisher.setName(name.appendSequenceNumber(sequence++))
                    .setFreshnessMilliseconds(60 * 60 * 1000)
                    .setToPublish(message)
                    .publish(function onDataServeable(firstDataSegment){
                      console.log("heeeeeee")
                      onMessage(message);
                      var announcementName = new io.gremlin.ndn.Name(["!"])
                      announcementName.append(name);
                      console.log(announcementName.toUri())
                      var announcementInterest = new io.gremlin.ndn.Interest(announcementName);
                      io.gremlin.handleInterest(announcementInterest.wireEncode().buffer, function(){"excecuted chat", sequence - 1}, true)
                    })

};
module.exports = exports;
