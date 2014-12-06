
var gremlin = require("ndn-gremlin")
var dropkick = require('dropkick');
var IO = require("ndn-io");
require("setimmediate")




exports.joinRoom = function(roomName, onFileAnnounce, onMessage){

  window.io = new IO(new gremlin(),{}, function onReady(){
    io.gremlin.addConnection("ws://" + location.hostname, function(id){
      console.log("add connection calback", id)
      //var announcement = new io.gremlin.ndn.Interest(new io.gremlin.ndn.Name("!/" + roomName + "/" + window.handle));
      io.gremlin.addRegisteredPrefix(roomName, id)
                .registerPrefix(roomName, id)
                .registerPrefix("!/" + roomName, id)
                .registerPrefix("#/" + roomName, id)
                .addRegisteredPrefix("!/" + roomName, id)
                .addRegisteredPrefix("#/" + roomName, id)
                .addListener("!/" + roomName, function(interest, faceID){
                    console.log("new room Member");
                    var fileName = interest.name.get(2).toEscapedString()
                    console.log("fileName", fileName);
                    onFileAnnounce(fileName);
                }).addListener("#/" + roomName, function(interest, faceID){

                })


      window.chatRoom = io.createNamespace(roomName, function onChatPubliherReady(err, data){
        console.log(err, data);

        window.sequence = 0;

        chatRoom.publisher.serve(chatRoom.prefix.toUri());
        var fetchNextMessage = function fetchNextMessage(err, message){
          console.log("message fetch callback")
          if(!err){
            ++sequence;
            onMessage(message);
            console.log("incrementing", sequence)
          }
          var thisName = new io.gremlin.ndn.Name(roomName)
          console.log("err:", err, chatRoom.fetcher.masterInterest.toUri());
          chatRoom.fetcher.setName(thisName.appendSequenceNumber(sequence))
                          .setInterestLifetimeMilliseconds(1000)
                          .get(fetchNextMessage);

        }

        var thisName = new io.gremlin.ndn.Name(roomName);
        chatRoom.fetcher.setType("json")
                        .setName(thisName.appendSequenceNumber(sequence))
                        .setInterestLifetimeMilliseconds(400)
                        .get(fetchNextMessage)


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

exports.shareFile = function(file){
  filebox.publisher
         .setName(filebox.prefix.toUri() + "/" + file.name)
         .setToPublish(file)
         .setFreshnessMilliseconds(60 * 60 * 1000)
         .publish(function(err, data){
    var announcement = new io.gremlin.ndn.Interest(new io.gremlin.ndn.Name("!/" + roomName + "/" + file.name));
    io.gremlin.handleInterest(announcement.wireEncode().buffer,function(){console.log("hey you, file announced")});
  })
}

exports.getFile = function(fileName, callback){
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!filename", fileName, filebox.prefix.toUri())
  filebox.fetcher.setType("file")
                 .setName(filebox.prefix.toUri() + "/" + fileName)
                 .setInterestLifetimeMilliseconds(4000)
                 .get(function(err, data){
                   console.log("file fetch callback", err, data);
                   callback(err, data)
                 })//" + roomName + "/" + fileName, function(err, file){
    //console.log("got file?", err, file)
}

exports.chat = function(message){
  var name = new io.gremlin.ndn.Name(chatRoom.prefix);
  console.log(name)
  chatRoom.publisher.setName(name.appendSequenceNumber(sequence))
                    .setFreshnessMilliseconds(60 * 60 * 1000)
                    .setToPublish({
                      handle: window.handle
                      , message: message
                      , id : Date.now()
                    })
                    .publish(function onDataServeable(firstDataSegment){
                      console.log("data made and published", firstDataSegment.name.toUri())
                    })

}
module.exports = exports;
