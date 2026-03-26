const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STATUS_PREFIX = '__i18n__:{"key":"notice.chatStatusChanged"';
const BOT_ABORT_PREFIX = '__i18n__:{"key":"notice.botReplyStoppedBeforeStart"';

async function main() {
  const status = await prisma.chatMessage.updateMany({
    where: { content: { startsWith: STATUS_PREFIX } },
    data: { messageType: 'status_event', excludeFromBotMemory: true },
  });

  const aborted = await prisma.chatMessage.updateMany({
    where: { content: { startsWith: BOT_ABORT_PREFIX } },
    data: { messageType: 'bot_event', excludeFromBotMemory: true },
  });

  const botStream = await prisma.chatMessage.updateMany({
    where: {
      content: '',
      user: { email: { endsWith: '@harmonious.bot' } },
    },
    data: { messageType: 'bot_stream', excludeFromBotMemory: false },
  });

  const botReply = await prisma.chatMessage.updateMany({
    where: {
      content: { not: '' },
      user: { email: { endsWith: '@harmonious.bot' } },
      messageType: 'chat',
    },
    data: { messageType: 'bot_reply', excludeFromBotMemory: false },
  });

  console.log(JSON.stringify({
    statusUpdated: status.count,
    abortedUpdated: aborted.count,
    botStreamUpdated: botStream.count,
    botReplyUpdated: botReply.count,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
