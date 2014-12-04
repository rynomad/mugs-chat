var Pony = require("ndn-in-a-box");

  , myNameSpace = new Pony("com.example/")

  , chat = myNameSpace.cd("chatRoom");

chat.join(3)
    .setDataType("json")
    .subscribe( /* function */ displayChatMessage)
    .steward();

var fileShare = chat.cd("sharedFiles");

fileShare.listen(function(err, fileSuffix){
  if(!err){
    if (fileSuffix === "theFileIWant.zip"){
      fileShare.fetch(fileSuffix, /*function*/ handleFileObject);
    }
  }
});
