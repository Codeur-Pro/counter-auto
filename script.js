const { Partials, IntentsBitField } = require("discord.js");
const { Client } = require("discord.js");
const readline = require("readline");

const client = new Client({
  intents: [IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.Guilds],
  partials: [
    Partials.Message
  ]
})

const conf = require("./config.js");
const regexStartWithNumber = /^(\d+).*/;

const { BOT_TOKEN, CHANNEL_ID, AUTHOR_1, TOKEN_1, AUTHOR_2, TOKEN_2, MULTIPLE_ACCOUNTS, WAIT_TIME } = conf;

var token = TOKEN_1;
var author = AUTHOR_1;
var lastMessage = null;
var lastNumber = null;
var writeMessage = null;
var multipleAccounts = MULTIPLE_ACCOUNTS;
var WaitTime = WAIT_TIME;

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function sendTypingIndicator() {
  return await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/typing`, {
    method: "POST", 
    headers: {
      "Authorization": `${token}`
    },
  }).catch(console.error);
}

async function getLastMessage(){
  const lastMessages = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=1`, {
    method: "GET",
    headers: {
      "Authorization": `${token}`
    },
  }).then(res => res.json()).catch(console.error);
  return lastMessages[0] || false;
}

async function sendMessage(content) {
  return await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${token}`
    },
    body: JSON.stringify({
      content: content,
    })
  }).catch(console.error);
}

async function amorce(){
  const lastMessage = await getLastMessage();
  if(!lastMessage) return console.error("No last message");
  if(lastMessage.author.bot) return console.error("Last message is a bot");

  const match = lastMessage.content.match(regexStartWithNumber);
  if(!match) return console.error(`Message ${lastMessage.content} does not start with a number`);
  const number = parseInt(match[1]);
  if(!number) return console.error(`Number ${match[1]} is not a number`);

  if(lastMessage.author.id == author) {
    if(!multipleAccounts) {
      lastNumber = number;
      return console.log("Not multiple accounts");
    }
    if(token == TOKEN_1) {
      token = TOKEN_2;
      author = AUTHOR_2;
    }else {
      token = TOKEN_1;
      author = AUTHOR_1;
    }
  }

  const newNumber = number + 1;
  lastNumber = number;
  console.log(`${number} (${lastMessage.author.username}) => ${newNumber}`);
  var msgToSend = `${newNumber} ${lastMessage.content.substring(match[1].length)}`;
  if(writeMessage && writeMessage != null) {
    msgToSend += ` ${writeMessage}`;
    console.log(`Writing message: ${writeMessage}`)
  }
  writeMessage = null;
  await sendMessage(msgToSend);
}

client.on("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}, ${multipleAccounts && AUTHOR_2 && TOKEN_2 ? "avec 2 comptes utilisateurs" : "avec 1 compte utilisateur"}`);
});

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", async (input) => {

  if(input.startsWith("help")) {
    console.log("\nListe des commandes:");
    console.log("stop: stop le script");
    console.log("amorce: envoie un message avec le numéro suivant");
    console.log("1user: passe en mode 1 utilisateur");
    console.log("2user: passe en mode 2 utilisateurs");
    console.log("Sinon, le message sera envoyé à la prochaine amorce\n\n");
    return;
  }else if(input.startsWith("stop")) {
    console.log("Stopping...");
    process.exit();
  }else if(input.startsWith("amorce")) {
    writeMessage = null;
    await amorce();
    return;
  }else if (input.startsWith("1user")) {
    writeMessage = null;
    multipleAccounts = false;
    console.log("Set to 1 user");
    return;
  } else if (input.startsWith("2user")) {
    if(!AUTHOR_2 || !TOKEN_2) return console.error("No second user");
    multipleAccounts = true;
    writeMessage = null;
    console.log("Set to 2 users");
    return;
  } else if (input.startsWith("reset")) {
    writeMessage = null;
    lastNumber = null;
    lastMessage = null;
    console.log("Reset");
    return;
  } else if (input.startsWith("wait")) {
    const time = parseInt(input.split(" ")[1]);
    if(!time) return console.error("No time");
    console.log(`Set wait time to ${time} seconds`);
    WaitTime = time;
    return;
  }else {
    writeMessage = input;
    console.log(`Set message to write: ${input}`);
  }

});

client.on("messageCreate", async (message) => {
  if(message.channel.id !== CHANNEL_ID) return;
  if(message.author.bot) return;
  const messageContent = message.content;
  const messageAuthor = message.author.id;
  if((messageContent.startsWith(":") || messageContent.startsWith("!"))) return;

  if(messageAuthor == author) {
    if(!multipleAccounts) return;
    if(token == TOKEN_1) {
      token = TOKEN_2;
      author = AUTHOR_2;
    }else {
      token = TOKEN_1;
      author = AUTHOR_1;
    }
  }

  const match = messageContent.match(regexStartWithNumber);
  if(!match) return console.error(`Message ${messageContent} does not start with a number`);

  const number = parseInt(match[1]);
  if(!number) return console.error(`Number ${match[1]} is not a number`);

  if(lastNumber && lastNumber != false && lastNumber != null && number !== (lastNumber+2)) return console.error(`Number ${number} is not the same as last number ${lastNumber + 2}`);
  await sendTypingIndicator();
  await wait((WaitTime || 5) * 1000);
  
  const newNumber = number + 1;
  lastMessage = message;
  lastNumber = number;
  console.log(`${number} (${message.author.username}) => ${newNumber}`);
  var msgToSend = `${newNumber}`;
  if(writeMessage && writeMessage != null) {
    msgToSend += ` ${writeMessage}`;
    console.log(`Writing message: ${writeMessage}`)
  }
  writeMessage = null;
  await sendMessage(msgToSend);
});

client.login(BOT_TOKEN);