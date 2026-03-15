import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

import { emitToDorm } from '@/lib/socket-server';
import { ensureDormBotUser, isBotEmail } from './bot-service';
import { BOT_OTHER_CONTENT_KEY, listDormBotSettingsSafe } from './bot-settings-service';
import { pushDormNotification } from './notification-service';
import { listDormUserDescriptions } from './user-description-service';

export async function replyByDormBotIfMentioned(session: SessionUser, content: string): Promise<void> {
  const bot = await ensureDormBotUser(session.dormId);
  const mentionToken = `@${bot.name}`;
  if (!content.includes(mentionToken)) return;

  const dorm = await prisma.dorm.findFirst({
    where: { id: session.dormId },
    include: {
      users: {
        orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, email: true, isLeader: true },
      },
    },
  });
  if (!dorm) return;
  const allBotSettings = await listDormBotSettingsSafe(session.dormId);
  const descriptionMap = await listDormUserDescriptions(session.dormId);

  const memberRows = dorm.users.filter((item) => !isBotEmail(item.email));
  const membersMarkdown =
    memberRows.length === 0
      ? '1. 无'
      : memberRows
          .map((item, index) => {
            const desc = descriptionMap.get(item.id) || '无';
            return `${index + 1}. ${item.name}${item.isLeader ? '（舍长）' : ''}\n   - 描述：${desc}`;
          })
          .join('\n');
  let botOtherContent = '无';
  const botSettings = allBotSettings.filter((item) => {
    if (item.key === BOT_OTHER_CONTENT_KEY) {
      botOtherContent = item.value || '无';
      return false;
    }
    return true;
  });
  const settingsMarkdown =
    botSettings.length === 0
      ? '1. 无'
      : botSettings.map((item, index) => `${index + 1}. **${item.key}**: ${item.value}`).join('\n');
  const botReply = `## 你好，我是 ${bot.name}

### 机器人设定
${settingsMarkdown}

### 机器人的其他内容
${botOtherContent}

### 宿舍成员
${membersMarkdown}`;

  const botMessage = await prisma.chatMessage.create({
    data: {
      dormId: session.dormId,
      userId: bot.id,
      content: botReply,
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  emitToDorm(session.dormId, 'chat:new', {
    id: botMessage.id,
    userId: botMessage.userId,
    userName: botMessage.user.name,
    content: botMessage.content,
    createdAt: botMessage.createdAt.toISOString(),
  });

  const recipients = await prisma.user.findMany({
    where: {
      dormId: session.dormId,
      NOT: { email: { endsWith: '@harmonious.bot' } },
    },
    select: { id: true },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'chat',
    title: `${bot.name} 发来新消息`,
    content: '机器人已回复宿舍信息',
    targetPath: '/chat',
    groupKey: 'chat',
    recipientUserIds: recipients.map((item) => item.id),
  });
}
