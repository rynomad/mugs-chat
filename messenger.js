var ndnFunc = require("./src.js")

var dropkick = require('dropkick');




$(document).ready(function () {
  dropkick((document.body))
    .on('file', function(file) {
      console.log("file drop event", file)
      ndnFunc.shareFile(file)
    })
  ////
  // PubNub Decorator
  // -------------------
  // This wraps the pubnub libarary so we can handle the uuid and list
  // of subscribed channels.
  ////

  var chatChannel = '',
      username = '',
      users = [],
      usernameInput = $('#username'),
      chatRoomName = $("#chatRoomName"),
      chatButton = $("#startChatButton"),
      newChatButton = $("#newChatButton"),
      chatListEl = $("#chatList"),
      sendMessageButton = $("#sendMessageButton"),
      backButton = $("#backButton"),
      messageList = $("#messageList"),
      messageContent = $("#messageContent"),
      userList = $("#userList"),
      isBlurred = false,
      timerId = -1,
      pages = {
        home: $("#homePage"),
        chatList: $("#chatListPage"),
        chat: $("#chatPage"),
        delete: $("#delete")
      };

  // Blur tracking
  $(window).on('blur', function () {
    isBlurred = true;
  }).on("focus", function () {
    isBlurred = false;
    clearInterval(timerId);
    document.title = "Pub Messenger";
  });

  // Request permission for desktop notifications.
  var notificationPermission = 1;
  if (window.webkitNotifications) {
    notificationPermission = window.webkitNotifications.checkPermission();

    if (notificationPermission === 1) {
      window.webkitNotifications.requestPermission(function (event) {
        notificationPermission = window.webkitNotifications.checkPermission();
      });
    }
  }

  ////////
  // Home View
  /////
  function HomeView() {
    if (localStorage["username"]) {
      usernameInput.val(localStorage["username"]);
    }

    chatButton.off('click');
    chatButton.click(function (event) {
      if(usernameInput.val() != '') {
        username = usernameInput.val();

window.handle = username
        localStorage["username"] = username;


        $.mobile.changePage(pages.chatList);
      }
    });
  };

  /////
  // Chat List View
  ///////
  function ChatListView(event, data) {
    chatListEl.empty();
    newChatButton.off('click');
    newChatButton.click(function (event) {
      if(chatRoomName.val() !== '') {
        chatChannel = chatRoomName.val();
        window.roomName = chatChannel;
	console.log("chat list view click", pages.chat)
        $.mobile.changePage(pages.chat);
      }
    });
  };

var makeSaveButton = function(fileName, file){
  if(file !== null){
    var a = document.createElement("a")
    a.download = fileName;
    a.innerText = fileName
    a.href = URL.createObjectURL(file);
    $("#"+fileName.split(".")[0]).replaceWith(a);
    $("#"+fileName.split(".")[0] + "DL").remove()
  }console.log(a, file, fileName)
  //put link somewhere
}

var makeDownloadButton = function(fileName){
  var button = document.createElement("button")
  button.id = fileName.split(".")[0] + "DL"
  button.innerText = "download"
  button.onclick = function(){
    ndnFunc.getFile(fileName, function(err,file){
      console.log("file fetched", err, fileName, file)
      makeSaveButton(fileName, file)
    })
  }
  if ($("#"+fileName.split(".")[0]).length === 0){
    $("#fileBox").append("<li id= '" + fileName.split(".")[0] + "' data-fileName='" + fileName + "'>" + fileName + "</li>").append(button);
  }//put button somewhere
}
  //////
  // Delete Chat View
  ///////
  function DeleteChatView(event, data) {
    if (data.options && data.options.link) {
      var channelName = data.options.link.attr('data-channel-name'),
          deleteButton = pages.delete.find("#deleteButton");

      deleteButton.unbind('click');
      deleteButton.click(function (event) {
        console.log(pages.delete.children());
        pages.delete.find('[data-rel="back"]').click();
      });
    }
  };

  /////
  // Chatting View
  //////
  function ChatView(event, data) {
    var self = this;
    console.log("chatView", event, data)

    users = [];
    messageList.empty();
    userList.empty();

    ndnFunc.joinRoom(chatChannel, makeDownloadButton, function(message){
      //console.log("on message",  message, $("#" + message.handle).length);
      if ($("#" + message.handle).length === 0 ){
        userList.append("<li id= '" + message.handle + "' data-username='" + message.handle + "'>" + message.handle + "</li>");
      }
      self.handleMessage(message, true)

    })


    // Change the title to the chat channel.
    pages.chat.find("h1:first").text(chatChannel);

    messageContent.off('keydown');
    messageContent.bind('keydown', function (event) {
      if((event.keyCode || event.charCode) !== 13) return true;
      sendMessageButton.click();
      return false;
    });

    sendMessageButton.off('click');
    sendMessageButton.click(function (event) {
      var message = messageContent.val();

      if(message !== "") {
        messageContent.val("");
        ndnFunc.chat(message);


      }
    });

    backButton.off('click');
    backButton.click(function (event) {
      console.log("click off")
    });
  };

  // This handles appending new messages to our chat list.
  ChatView.prototype.handleMessage = function (message, animate) {
    if (animate !== false) animate = true;
    var messageEl = $("<li class='message'>"
        + "<span id='"+ message.id + "'class='username'>" + message.handle + "</span>"
        + message.message
        + "</li>");
    messageList.append(messageEl);
    messageList.listview('refresh');

    // Scroll to bottom of page
    if (animate === true) {
      $("html, body").animate({ scrollTop: $(document).height() - $(window).height() }, 'slow');
    }

    if (isBlurred) {
      // Flash title if blurred
      clearInterval(timerId);
      timerId = setInterval(function () {
        document.title = document.title == "Pub Messenger" ? "New Message" : "Pub Messenger";
      }, 2000);


    }
  };

  // Initially start off on the home page.
  $.mobile.changePage(pages.home);
  var currentView = new HomeView();

  // This code essentially does what routing does in Backbone.js.
  // It takes the page destination and creates a view based on what
  // page the user is navigating to.
  $(document).bind("pagechange", function (event, data) {
    if (data.toPage[0] == pages.chatList[0]) {
      currentView = new ChatListView(event, data);
    } else if (data.toPage[0] == pages.delete[0]) {
      currentView = new DeleteChatView(event, data);
    } else if (data.toPage[0] == pages.chat[0]) {
      currentView = new ChatView(event, data);
    }
  });
});
