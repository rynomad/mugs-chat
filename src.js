
var gremlin = require("ndn-gremlin")
var dropkick = require('dropkick');
var IO = require("ndn-io");
require("setimmediate")



function becomeAwareOfUsers(users, userList){
  var toReturn = [];

    var dup = false;
  for(var i = 0; i < users.length; i++){
    console.log(users[i])
    var children = userList.children();
    for (var j = 0; j < children.length; j++){
      if (users[i] === children[j].innerText){
        dup = true;
      }
      console.log(toReturn, children[j].innerText)
    }
    console.log(!dup)
    if (!dup){
      toReturn.push(users[i])
      var el = document.createElement("li");
      el.innerText = users[i]
      userList.append(el);
    }
  }

  toReturn = toReturn.concat(users)
  return toReturn;
}

window.filesAware = []

window.Buffer = Buffer;
exports.onHandleChosen = function(handle, chatListEl){
  if (!window.io){
    window.io = new IO(new gremlin(),{}, function onIOReady(){
      io.gremlin.addConnection("ws://"+ location.hostname, function(id){
        window.hostID = id;

        var askForRoomInferests = new io.gremlin.ndn.Interest(new io.gremlin.ndn.Name(["?", "@", handle]));
        io.gremlin.addRegisteredPrefix("?/", id)
                  .addRegisteredPrefix("%/", id)
                  .registerPrefix("@/"+ handle + "/%", id)
                  .addListener({prefix:"@/"+ handle + "/%", blocking:true}, function(interest, faceID){
                    console.log("got inferest for room", chatListEl)
                    var chatName = interest.name.get(-1).toEscapedString()

                    var chatEl = $("<li><a href='#chatPage' data-channel-name='" + chatName + "'>"
                          + chatName
                          + "</a><a href='#delete' data-rel='dialog' data-channel-name='" + chatName + "'></a></li>");
                    chatListEl.append(chatEl);
                  })
                  .handleInterest(askForRoomInferests.wireEncode().buffer, function(){}, true);
      })
    })
  } else {

    var askForRoomInferests = new io.gremlin.ndn.Interest(new io.gremlin.ndn.Name(["?", "@", handle]));
    chatListEl.empty();
    window.io.gremlin.handleInterest(askForRoomInferests.wireEncode().buffer, function(){}, true)
  }
}


exports.createRoom = function(roomName, onFileAnnounce, onMessage, userList){
  window.onFileAnnounce = onFileAnnounce;
  window.onMessage = onMessage;
  window.roomName = roomName;
  console.log(handle, userList)
  becomeAwareOfUsers([handle], userList)
  window.chatRoom = io.createNamespace("@/"+roomName + "/" + handle, function onChatPubliherReady(err, data){
    console.log(err, data);

    window.sequence = 0;

    chatRoom.publisher.serve("@/" + roomName + "/user/" + handle);
    chatRoom.fetcher.setType("json")
                    .setInterestLifetimeMilliseconds(1000)

  })
  window.hostFace = 0;
  if (!window.filebox) openFileBox()


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
    var slug = interest.name.get(2).toEscapedString();
    var extension = interest.name.get(3).toEscapedString();
    if (typeof faceID === "number"){
      io.gremlin.addRegisteredPrefix(interest.name.getSubName(1), faceID);
    }
    becomeAwareOfFiles([{slug:slug,extension:extension}])
  })
  .addListener({prefix: "?/", blocking:true}, function(interest, faceID, unblock){
    console.log("got interest for inferest")
    var roomAnnounceName = interest.name.getSubName(1).append("%").append(roomName)
    console.log("r", roomAnnounceName.toUri())
    var roomInferest = new io.gremlin.ndn.Interest(roomAnnounceName)

    io.gremlin.addRegisteredPrefix(roomAnnounceName.toUri(), 0);

    io.gremlin.handleInterest(roomInferest.wireEncode().buffer, function(){}, true)
  })
  .addListener({prefix:"!/?"}, function(interest, faceID, unblock){
    console.log("got join room", userList, filesAware , interest.toUri())
    var handle = interest.name.get(2).toEscapedString();
    var users = becomeAwareOfUsers([handle], userList);
    var response = new io.gremlin.ndn.Data(new io.gremlin.ndn.Name(interest.name), new io.gremlin.ndn.SignedInfo(), JSON.stringify({files:filesAware, users:users}))
    response.signedInfo.setFields();


    response.sign(function(){

      io.gremlin.interfaces.dispatch(response.wireEncode().buffer,[faceID])
    }
    )
  })
  .registerPrefix("%/"+ roomName, 0)
  .registerPrefix("?/", 0)

}

function openFileBox(){

  window.filebox = io.createNamespace("#", function(){
    console.log("filebox ready")
    filebox.publisher.serve("#")
    if (!localStorage["fileList"]){
      localStorage["fileList"] = "[]"
    } else {
      var fileList = JSON.parse(localStorage["fileList"])

      becomeAwareOfFiles(fileList)
      for(var i = 0; i < fileList.length; i++){
        announceFile(fileList[i].slug, fileList[i].extension, true);
      }
    }
  })

}

function becomeAwareOfFiles(files){
  var dup;
  console.log(files)
  for (var i = 0; i < files.length; i++){
    dup = false;
    for (var j =0; j < filesAware.length; j++){
      if (files[i].slug == filesAware[j].slug && files[i].extension == filesAware[j].extension){
        dup = true
        break;
      }
    }
    console.log(dup)
    if (dup) {
      continue;
    } else {
      filesAware.push(files[i])
      onFileAnnounce(files[i].slug, files[i].extension)
    };
  }
}

exports.joinRoom = function(roomName, onFileAnnounce, onMessage, userList){

    window.onFileAnnounce = onFileAnnounce;
  window.onMessage = onMessage;
  window.roomName = roomName
  window.chatRoom = io.createNamespace("@/"+roomName + "/" + handle, function onChatPubliherReady(err, data){
    console.log(err, data);

    window.sequence = 0;

    chatRoom.publisher.serve("@/" + roomName + "/user/" + handle);
    chatRoom.fetcher.setType("json")
                    .setInterestLifetimeMilliseconds(1000)


  })


  var count = {
    onFace: 0
    , onData : 0
  }

  io.gremlin.requestConnection("%/"+roomName + "/connect", function onConnectedToRoom(err, id){
    console.log("connection?", id)
    window.hostFace = id;
    if (!window.filebox) openFileBox()
    io.gremlin.registerPrefix("@/"+roomName + "/user/"+ handle, id)
              .registerPrefix("!/?", id)
              .addRegisteredPrefix("!", id)
              .addRegisteredPrefix("@/"+ roomName, id)
              .addRegisteredPrefix("#", id)
    var initName = new io.gremlin.ndn.Name("!/?")
    initName.append(handle);
    var fileListInterest = new io.gremlin.ndn.Interest(initName)
    fileListInterest.setInterestLifetimeMilliseconds(1000)
    count.onFace++
    io.gremlin.handleInterest(fileListInterest.wireEncode().buffer, function(element, interest, arg3){
      var d = new io.gremlin.ndn.Data()
      if (element){
        count.onData++
        d.wireDecode(element)

        console.log("file list?", count )
        var obj = JSON.parse(io.gremlin.ndn.DataUtils.toString(d.content))
        console.log(obj)
        becomeAwareOfFiles(obj.files)
        becomeAwareOfUsers(obj.users, userList)
      }
    }, true)
  })
  .addListener({prefix: "!/@", blocking:true}, function(interest, faceID){
    console.log("got chat announce", interest.toUri())
    var chatName = interest.name.getSubName(1);
    chatRoom.fetcher.setName(chatName)
                    .get(function(err, message){
                      console.log(chatName.toUri(), err, message)
                      if (!err){
                        console.log();
                        onMessage(message);
                      }
                    });

  })
  .addListener({prefix: "!/#", blocking:true}, function(interest, faceID, unblock){
    console.log("got file announce")
    var slug = interest.name.get(2).toEscapedString();
    var extension = interest.name.get(3).toEscapedString();
    if (typeof faceID === "number"){
      io.gremlin.addRegisteredPrefix(interest.name.getSubName(1), faceID);
    } else {
      unblock();
    }
    becomeAwareOfFiles([{slug:slug, extension:extension}])
    //filesAware.push({slug:slug,extension:extension})
    //onFileAnnounce(slug, extension);
  })
  .addListener({prefix:"!/?", blocking:true}, function(interest, faceID, unblock){
    var handle = interest.name.get(2).toEscapedString();
    becomeAwareOfUsers([handle], userList)
    console.log("got join room", userList, filesAware )

  })
};

function announceFile(slug, extension, skipInsert){
  var announcementName = new io.gremlin.ndn.Name(["!", "#", slug, extension]);
  var announcement = new io.gremlin.ndn.Interest(announcementName);
  io.gremlin.handleInterest(announcement.wireEncode().buffer,function(){console.log("hey you, file announced")});

  if (hostFace) io.gremlin.registerPrefix(announcementName.getSubName(1), hostFace)
  if (!skipInsert){
    var insert = JSON.parse(localStorage["fileList"])
    //console.log(fileList,"????????????")
    insert.push({slug:slug,extension:extension});
    localStorage["fileList"] = JSON.stringify(insert)
  }
}

exports.leaveRoom = function(){
  var announcementName = new io.gremlin.ndn.Name(["!" , roomName, "0", handle]);
  var announcement = new io.gremlin.ndn.Interest(announcementName.append(filebox.publisher.name));
}

exports.shareFile = function(file){
  var extension = file.name.substr(file.name.indexOf(".") + 1);
  var slug = file.name.substr(0, file.name.indexOf(".")).toLowerCase().replace(/-+/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  var prefix = new io.gremlin.ndn.Name(["#", slug, extension ])
  filebox.publisher
         .setName(prefix)
         .setToPublish(file)
         .setFreshnessMilliseconds(60 * 60 * 1000)
         .publish(function(err, data){

  })
  announceFile(slug, extension)
}

exports.getFile = function(slug, extension, callback){
  var t1 = Date.now();
  filebox.fetcher.setType("file")
                 .setName("#/" +  slug +"/"+ extension)
                 .setInterestLifetimeMilliseconds(4000)
                 .get(function(err, data){
                   if (!err){
                     io.steward("#/" +  slug +"/"+ extension, function(err, uri){
                       console.log(err, uri, "?????????");
                       announceFile(slug, extension)
                     })
                   }
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
                    .setFreshnessMilliseconds(12000)
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
