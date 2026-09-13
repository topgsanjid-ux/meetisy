/**
 * Slack & Microsoft Teams Webhook Broadcast Engine
 * Supports Slack Block Kit formatting and MS Teams Adaptive Cards
 * with Urgent Blocker Escalation routing.
 */

/**
 * Send a Slack notification via Incoming Webhook
 */
export async function sendSlackWebhook(webhookUrl, standup, summary, blockers = []) {
  if (!webhookUrl) return { success: false, reason: 'No webhook URL provided' };

  const user = standup.users || { name: standup.author_name || 'Team Member', email: '' };
  const criticalBlockers = blockers.filter(b => b.severity === 'critical' || b.severity === 'high');

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `⚡ Standup Update: ${user.name}`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Author:*\n${user.name}` },
        { type: 'mrkdwn', text: `*Time:*\n<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toLocaleTimeString()}>` }
      ]
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✅ Accomplished / Status:*\n${summary.status || 'Updated status deliverables.'}`
      }
    }
  ];

  if (summary.blockers && summary.blockers !== 'None reported.') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🚨 Blockers & Impediments:*\n${summary.blockers}`
      }
    });
  }

  if (summary.next_steps) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎯 Next Steps:*\n${summary.next_steps}`
      }
    });
  }

  if (summary.decisions && summary.decisions !== 'No major architectural decisions reported today.') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📐 Key Architectural Decisions:*\n${summary.decisions}`
      }
    });
  }

  if (criticalBlockers.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *URGENT ESCALATION:* ${criticalBlockers.length} high-severity blocker(s) flagged for team lead review.`
      }
    });
  }

  const payload = { text: `Standup update from ${user.name}`, blocks };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: response.ok, status: response.status };
  } catch (err) {
    console.warn('Slack Webhook dispatch error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Microsoft Teams notification using Adaptive Cards
 */
export async function sendTeamsWebhook(webhookUrl, standup, summary, blockers = []) {
  if (!webhookUrl) return { success: false, reason: 'No webhook URL provided' };

  const user = standup.users || { name: standup.author_name || 'Team Member' };
  const criticalBlockers = blockers.filter(b => b.severity === 'critical' || b.severity === 'high');

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: `⚡ Standup Update: ${user.name}`,
              color: 'Accent'
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Author:', value: user.name },
                { title: 'Time:', value: new Date().toLocaleTimeString() }
              ]
            },
            {
              type: 'TextBlock',
              text: `**Accomplished:** ${summary.status || 'Updated tasks.'}`,
              wrap: true
            },
            {
              type: 'TextBlock',
              text: `**Blockers:** ${summary.blockers || 'None reported.'}`,
              wrap: true,
              color: summary.blockers && summary.blockers !== 'None reported.' ? 'Attention' : 'Default'
            },
            {
              type: 'TextBlock',
              text: `**Next Steps:** ${summary.next_steps || 'Proceeding to tasks.'}`,
              wrap: true
            }
          ]
        }
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: response.ok, status: response.status };
  } catch (err) {
    console.warn('Teams Webhook dispatch error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch Urgent Blocker Alert across webhooks
 */
export async function dispatchUrgentBlockerAlert(webhookUrl, blocker, user) {
  if (!webhookUrl) return { success: false };

  const payload = {
    text: `🚨 URGENT BLOCKER ESCALATION: ${user?.name || 'Developer'} is blocked!`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 URGENT BLOCKER ESCALATION',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Developer:* ${user?.name || 'Team Member'}\n*Severity:* ${blocker.severity?.toUpperCase() || 'CRITICAL'}\n*Description:*\n> ${blocker.description}`
        }
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
