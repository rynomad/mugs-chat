
var gremlin = require("ndn-gremlin")
var dropkick = require('dropkick');
var IO = require("ndn-io");
require("setimmediate")




exports.joinRoom = function(roomName, onFileAnnounce, onMessage, userList){
  window.onMessage = onMessage;
  window.io = new IO(new gremlin(),{}, function onReady(){
    io.gremlin.addConnection("ws://129.82.138.231" , function(id){
      console.log("add connection calback", id)
      window.hostFace = id
      window.sessionTime = Date.now();
      window.announcementName = new io.gremlin.ndn.Name(["!" , roomName , "!" , window.handle]);
      var announcement = new io.gremlin.ndn.Interest(announcementName.appendTimestamp(sessionTime));
      announcement.setInterestLifetimeMilliseconds(20);
      io.gremlin.addRegisteredPrefix(roomName, id)
                .registerPrefix(roomName, id)
                .registerPrefix("!/" + roomName, id)
                .registerPrefix("@/" + handle, id)
                .addRegisteredPrefix("@", id)
                .addRegisteredPrefix("!/" + roomName, id)
                .addRegisteredPrefix("#", id)
                .addListener({prefix: "!/"+roomName, blocking:true}, function(interest, faceID, unblock){
                  console.log("listener triggered")
                  var type = interest.name.get(2).value
                  if (type.length === 1){
                    if (type[0] === 64){
                      var chatMessageName = interest.name.getSubName(2)
                      chatRoom.fetcher.setName(chatMessageName)
                                      .setType("json")
                                      .setInterestLifetimeMilliseconds(1000)
                                      .get(function(err, message){
                                        if (!err){
                                          onMessage(message)
                                        }
                                      });
                    } else if (type[0] === 35){
                      var slug = interest.name.get(4).toEscapedString();
                      var extension = interest.name.get(5).toEscapedString();
                      onFileAnnounce(slug, extension);
                      unblock();
                    } else if (type[0] === 33){
                      console.log("new member");
                      var memhandle = interest.name.get(3).toEscapedString();

                      var timeStamp = interest.name.get(-1).toTimestamp();
                      console.log("newmember", memhandle, timeStamp, sessionTime)
                      if ($("#" + memhandle).length === 0 ){
                        userList.append("<li id= '" + memhandle + "' data-username='" + memhandle + "'>" + memhandle + "</li>");
                        io.gremlin.handleInterest(announcement.wireEncode().buffer, function(){}, true)
                        if (timeStamp >= sessionTime){
                          onMessage({
                            handle: roomName
                            , message: memhandle + " has joined the room"
                            , id: Date.now()
                          })
                        }
                      }

                    } else if (type[0] === 48){

                      var memhandle = interest.name.get(3).toEscapedString();
                      if ($("#" + memhandle).length > 0 ){
                        $("#" + memhandle).remove();
                        onMessage({
                          handle: roomName
                          , message: memhandle + " has left the room"
                          , id: Date.now()
                        })
                      }
                    }
                  }

                })

                io.gremlin.handleInterest(announcement.wireEncode().buffer, function(){})

      window.chatRoom = io.createNamespace("@/"+handle, function onChatPubliherReady(err, data){
        console.log(err, data);

        window.sequence = 0;

        chatRoom.publisher.serve("@/"+handle + "/"+ roomName);

        /*
        var fetchNextMessage = function fetchNextMessage(err, message){
          console.log("message fetch callback")
          if(!err){
            ++sequence;
            onMessage(message);
            console.log("incrementing", sequence)
          }
          var thisName = new io.gremlin.ndn.Name(roomName)
          console.log("err:", err, chatRoom.fetcher.masterInterest.toUri());


        }

        var thisName = new io.gremlin.ndn.Name(roomName);
        chatRoom.fetcher.setType("json")
                        .setName(thisName.appendSequenceNumber(sequence))
                        .setInterestLifetimeMilliseconds(400)
                        .get(fetchNextMessage)

  */
      });


      window.filebox = io.createNamespace("#/" + roomName, function(){
        console.log("filebox ready")
        filebox.publisher.serve("#/" + roomName)
      } )
    })



  })
  /*
  window.room = new NameSpace(roomName)
  room.join(2, function(err, faceID){
    console.log("new peer connection in the room", err, faceID)
  })
  .setDataType("json")
  .subscribe(function(err, data){
    if(!err){
      onMessage(data)
      //console.log(data)
    } else {
      console.log(err)
    }
  })

  window.fileBox = room.IO("files")
  console.log(room, fileBox)
  fileBox.setDataType("file")
         .listen(function(err, fileName){
           //console.log("got file announce", fileName)
           window.fileName = fileName
           onFileAnnounce(fileName)
         })
         */
}

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

  var announcementName = new io.gremlin.ndn.Name(["!" , roomName]);
  var announcement = new io.gremlin.ndn.Interest(announcementName.append(filebox.publisher.name));
  io.gremlin.registerPrefix(prefix, hostFace)
            .handleInterest(announcement.wireEncode().buffer,function(){console.log("hey you, file announced")});
}

exports.getFile = function(slug, extension, callback){
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!filename", filebox.prefix.toUri())
  filebox.fetcher.setType("file")
                 .setName("#/" + roomName +"/"+ slug +"/"+ extension)
                 .setInterestLifetimeMilliseconds(4000)
                 .get(function(err, data){
                   console.log("file fetch callback", err, data);
                   callback(err, data)
                 })//" + roomName + "/" + fileName, function(err, file){
    //console.log("got file?", err, file)
}

exports.chat = function(message){
  var name = new io.gremlin.ndn.Name(["@",handle, roomName]);
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
                      var announcementName = new io.gremlin.ndn.Name(["!",roomName])
                      announcementName.append(name);
                      console.log(announcementName.toUri())
                      var announcementInterest = new io.gremlin.ndn.Interest(announcementName);
                      io.gremlin.handleInterest(announcementInterest.wireEncode().buffer, function(){"excecuted chat", sequence - 1}, true)
                    })

}
module.exports = exports;
