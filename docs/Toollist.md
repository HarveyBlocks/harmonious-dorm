# 机器人使用说明文档



## 工具列表概览

| 工具名称                           | 功能简述                       | 主要使用角色             |
| ---------------------------------- | ------------------------------ | ------------------------ |
| `create_bill`                      | 创建新账单                     | 所有成员                 |
| `create_duty`                      | 创建值日任务                   | 仅舍长（或经舍长同意）   |
| `update_long_memory`               | 更新机器人的长期记忆           | 舍长                     |
| `update_robot_short_memory_length` | 调整机器人的短期记忆窗口长度   | 舍长                     |
| `update_robot_name`                | 修改机器人的名字               | 舍长                     |
| `add_robot_character_field`        | 增加或修改机器人的性格设定字段 | 舍长                     |
| `remove_robot_character_field`     | 删除机器人的性格设定字段       | 舍长                     |
| `reset_member_description`         | 修改某位成员的个性化描述       | 本人、舍长或目标成员同意 |



## 工具详细说明

### 1. 创建账单 

> `create_bill`

**功能描述** 
在宿舍内创建一笔新账单，记录费用和分摊方式。支持自定义成员分摊权重，若不指定权重则默认所有成员平均分摊。

**适用角色** 
所有宿舍成员均可发起。

**输入参数说明**

| 参数名     | 类型 | 是否必填 | 说明                                                         |
| ---------- | ---- | -------- | ------------------------------------------------------------ |
| `cost`     | 整数 | 是       | 费用金额，单位为**分**（例如 1000 表示 10.00 元）            |
| `createBy` | 整数 | 是       | 发起创建账单的用户的唯一 ID                                  |
| `weights`  | 数组 | 否       | 分摊权重列表。每个元素包含 `memberUserId` 和 `weight`。<br>• 不传或传空数组：所有成员平分<br>• 只列出部分成员：未列出的成员不参与分摊<br>• 权重值可以是任意数字，系统会自动归一化处理 |

**示例场景**  

- 用户 A 说：“我买了 50 元的零食，大家平摊。” → 调用 `create_bill`，`cost=5000`，不传 `weights`。
- 用户 B 说：“我和 C、D 一起吃饭，我出 40，C 出 30，D 出 30。” → 调用时传入三个成员的权重，系统自动按比例计算。



### 2. 创建值日任务 

> `create_duty`

**功能描述** 
安排一次值日任务，指定执行人、任务内容和日期。为保证公平，此功能默认仅舍长可调用；普通成员若想创建任务，需先获得舍长口头同意，再由舍长代为操作。

**适用角色** 
仅舍长（或经舍长明确授权）。

**输入参数说明**

| 参数名         | 类型   | 是否必填 | 说明                                                 |
| -------------- | ------ | -------- | ---------------------------------------------------- |
| `memberUserId` | 整数   | 是       | 负责执行该值日任务的用户 ID                          |
| `task`         | 字符串 | 是       | 对值日内容的具体描述（例如“扫地”、“倒垃圾”）         |
| `date`         | 字符串 | 是       | 值日执行日期，格式为 `YYYY-MM-DD`（例如 2026-03-20） |

**示例场景** 
舍长说：“明天让张三负责扫地。” → 调用 `create_duty`，传入张三的 ID、任务“扫地”、日期“2026-03-18”。



### 3. 更新长期记忆 

> `update_long_memory`

**功能描述** 
将新的重要信息总结并记录到机器人的“长期记忆”中。长期记忆会持久保存，用于在后续对话中回忆。若记忆文本过长，机器人会自动压缩，确保总字数不超过限制。

**适用角色** 
舍长或经授权的成员（通常由舍长管理）。

**输入参数说明**

| 参数名          | 类型   | 是否必填 | 说明                                     |
| --------------- | ------ | -------- | ---------------------------------------- |
| `newLongMemory` | 字符串 | 是       | 更新后的长期记忆文本，支持 Markdown 格式 |

**示例场景** 
舍长说：“记住我们宿舍的 Wi-Fi 密码是 12345678。” → 调用此工具，将信息存入长期记忆。



### 4. 修改短期记忆窗口长度

> `update_robot_short_memory_length`

**功能描述** 
调整机器人短期记忆的容量。短期记忆影响机器人能记住最近多少条对话消息，不同长度适用于不同活跃度的群聊。

**适用角色** 
仅舍长。

**输入参数说明**

| 参数名   | 类型 | 是否必填 | 说明                                                         |
| -------- | ---- | -------- | ------------------------------------------------------------ |
| `length` | 整数 | 是       | 记忆窗口长度，推荐范围：<br>• 5～10：日常简单对话<br>• 10～15：辅助日常任务<br>• 15～20：技术交流<br>• 20～30：超活跃群聊 |

**示例场景** 
舍长说：“最近群里太活跃了，把记忆窗口调到 25。” → 调用工具设置 `length=25`。



### 5. 修改机器人名字

> `update_robot_name`

**功能描述** 
更改机器人在群里的称呼。

**适用角色** 
仅舍长。

**输入参数说明**

| 参数名 | 类型   | 是否必填 | 说明           |
| ------ | ------ | -------- | -------------- |
| `name` | 字符串 | 是       | 机器人的新名字 |

**示例场景** 
舍长说：“以后叫你小助手。” → 调用工具设置 `name="小助手"`。



### 6. 增加/修改性格设定字段

> `add_robot_character_field`

**功能描述**  
为机器人添加或修改性格设定中的键值对字段。例如设定“喜欢：猫”、“讨厌：香菜”。如果字段已存在，则覆盖原值。

**适用角色**  
仅舍长。

**输入参数说明**

| 参数名   | 类型 | 是否必填 | 说明                                                         |
| -------- | ---- | -------- | ------------------------------------------------------------ |
| `fields` | 数组 | 是       | 包含多个键值对的对象数组。每个对象包含 `field`（字段名）和 `value`（字段值） |

**示例场景** 
舍长说：“给机器人加个设定：爱好是篮球。” → 调用工具，传入 `[{ field: "爱好", value: "篮球" }]`。



### 7. 删除性格设定字段 

> `remove_robot_character_field`

**功能描述** 
删除机器人性格设定中的指定字段。如果字段不存在，则忽略。

**适用角色** 
仅舍长。

**输入参数说明**

| 参数名   | 类型 | 是否必填 | 说明                             |
| -------- | ---- | -------- | -------------------------------- |
| `fields` | 数组 | 是       | 待删除的字段名列表（字符串数组） |

**示例场景** 
舍长说：“把机器人的‘讨厌’设定去掉。” → 调用工具，传入 `["讨厌"]`。



### 8. 修改成员描述

>  `reset_member_description`

**功能描述** 
更新某位宿舍成员的个性化描述（人设）。该描述可用于机器人介绍成员特点。

**适用角色与权限规则**  
- **本人修改自己的描述**：可直接调用。
- **修改他人的描述**：需经过舍长或目标成员本人同意。
- **舍长直接修改任何成员的描述**：允许。

**输入参数说明**

| 参数名         | 类型   | 是否必填 | 说明                                                         |
| -------------- | ------ | -------- | ------------------------------------------------------------ |
| `memberUserId` | 整数   | 是       | 目标成员的用户 ID<br>• 若说“修改我的描述”，则传入自己的 ID<br>• 若说“修改张三的描述”，则传入张三的 ID |
| `description`  | 字符串 | 是       | 新的描述文本（可对原始语句进行错别字优化）                   |

**示例场景**  
- 用户 A 说：“把我的描述改成‘喜欢安静’。” → 调用工具，传入 A 的 ID 和“喜欢安静”。
- 舍长说：“把 B 的描述改为‘运动健将’。” → 调用工具，传入 B 的 ID 和“运动健将”。



## 权限规则总结

| 工具                               | 本人      | 舍长        | 他人（需授权） |
| ---------------------------------- | --------- | ----------- | -------------- |
| `create_bill`                      | ✅         | ✅           | ✅              |
| `create_duty`                      | ❌         | ✅           | ❌              |
| `update_long_memory`               | ❌         | ✅           | ❌              |
| `update_robot_short_memory_length` | ❌         | ✅           | ❌              |
| `update_robot_name`                | ❌         | ✅           | ❌              |
| `add_robot_character_field`        | ❌         | ✅           | ❌              |
| `remove_robot_character_field`     | ❌         | ✅           | ❌              |
| `reset_member_description`         | ✅（自己） | ✅（任何人） | 需目标成员同意 |

- 无权限的成员, 可以要求舍长代为执行

## 重要注意事项

1. **用户 ID 验证** 
   所有涉及 `memberUserId`、`createBy` 的参数，系统会在后端批量验证这些 ID 是否属于本宿舍成员，避免错误操作。

2. **权重分摊逻辑** 
   在 `create_bill` 中，若提供了 `weights` 列表，但总和不为 1，系统会自动归一化处理（即按比例计算每人应付金额）。未列出的成员默认为不参与分摊。

3. **日期格式** 
   `create_duty` 中的日期必须严格遵循 `YYYY-MM-DD` 格式，系统会拒绝其他格式的输入。

4. **记忆文本长度** 
   `update_long_memory` 传入的文本如果过长，机器人会自动压缩摘要，保证不超出预设字数限制。

5. **字段覆盖与删除**  

   `add_robot_character_field` 如果字段已存在会直接覆盖；`remove_robot_character_field` 对不存在的字段会静默忽略，不会报错。

6. **确认机制**

   机器人在分析了用户需求后, 不会马上调用Tool, 而是应该先将其调用Tool的计划告知用户, 然后用户进一步决定"接受"和"拒绝"后才能进行下一步操作



## Codes List

### Long Turn Memory

```json
{
  "robot":{
    "name": "萝卜头", // 舍长可设置
    "character": [// 舍长可设置, 人设
      {
        "field": "人设",
        "value": "可爱的猫娘JK"
      },{
        "field": "语气",
        "value": "娇嗔的"
      }
    ]
  },
  "dorm":{ // 宿舍信息
    "name": "dorm-123", // 宿舍名
    "members":[
      {
        "id": 23,// 服务端提供
        "name": "宿舍成员A",// 服务端提供
        "leader": true,// 服务端提供
        "description": "最帅" // 可用户修改, 舍长可以改全员, 成员可以改自己
      },
      {
        "id": 24,
        "name": "宿舍成员B",
        "leader": false,
        "description": "最可爱"
      }
    ]
  },
  "metaData":{ // 元数据, 表示基础数据
      "nowTime": "yyyy-MM-dd hh:mm:ss",//后端提供
      "longMemoryMaxLength": 1111,//后端提供, 保证是和其他地方统一
      // TODO 待丰富
  }
  "longMemory": "长文本, 交给AI总结, Maybe markdown, 可供用户编辑" // 舍长可以修改
}
```



### Tool List

```ts
const tools = [
    {
        type: "function",
        function: {
            name: "create_bill",
            description: "创建账单",
            parameters: {
                type: "object",
                properties: {
                    cost: {
                        type: "integer",
                        description: "费用, 单位: 分; 总费用",
                    },
                    createBy: {
                        // 需要代码检查这个ID是否正确, 就看这个ID是否属于这个宿舍
                        type: "integer",
                        description: "提出创建账单的用户ID",
                    },
                    weights: {
                        type: "array",
                        description: "每个宿舍成员的分账权重。若该参数不传/传null/传空数组，则表示所有成员平分；若只给出部分成员，则未列出的成员不参与分账。",
                        items: {
                            type: "object",
                            properties: {
                                memberUserId: {
                                    // 需要代码检查这个ID是否正确, 就看这个ID是否属于这个宿舍.
                                    // 包括上面那个createBy的id, 和这里的id, 可以联合再一起进行一次批量的查询, 而不是做n个查询
                                    type: "integer",
                                    description: "宿舍成员的用户ID",
                                },
                                weight: {
                                    type: "number",
                                    description: "权重，各权重之和不要求为1，函数内部会归一化处理",
                                },
                            },
                            required: ["memberUserId", "weight"],
                            additionalProperties: false,
                        },
                    },
                },
                required: ["cost", "createBy"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "create_duty",
            description: "创建值日任务。一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出创建任务后，舍长用自然语言同意后，才能调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    memberUserId: {
                        // 需要代码检查这个ID是否正确, 就看这个ID是否属于这个宿舍
                        type: "integer",
                        description: "提出创建值日任务的用户ID",
                    },
                    task: {
                        type: "string",
                        description: "对值日任务的描述",
                    },
                    date: {
                        type: "string",
                        description: "安排的值日进行的日期（未来时间），格式 yyyy-mm-dd",
                        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                    },
                },
                required: ["memberUserId", "task", "date"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_long_memory",
            description: "总结新记忆，并记录到长记忆配置文件中；如果长记忆文本过长，则总结压缩，保证不超字数。一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出需要调用后，舍长用自然语言同意后，才能调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    newLongMemory: {
                        type: "string",
                        description: "更新后的 longMemory 文本，要求字数在设定值以内，支持 Markdown 格式。",
                    },
                },
                required: ["newLongMemory"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_robot_short_memory_length",
            description: "修改机器人短期记忆的记忆窗口长度。一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出需要调用后，舍长用自然语言同意后，才能调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    length: {
                        type: "integer",
                        description: "机器人的记忆窗口长度：5-10适合日常简单对话；10-15适合辅助日常任务；15-20适合技术交流；20-30适合超活跃群聊。",
                    },
                },
                required: ["length"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_robot_name",
            description: "修改机器人的名字。一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出需要调用后，舍长用自然语言同意后，才能调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "机器人的新名字",
                    },
                },
                required: ["name"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "add_robot_character_field",
            description: "增加机器人的设定字段。如果键已存在，则覆盖；不存在则新增。一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出调用需求后，舍长用自然语言同意后，才能调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    fields: {
                        type: "array",
                        description: "多个键值对字段",
                        items: {
                            type: "object",
                            properties: {
                                field: {
                                    type: "string",
                                    description: "字段名",
                                },
                                value: {
                                    type: "string",
                                    description: "字段值",
                                },
                            },
                            required: ["field", "value"],
                            additionalProperties: false,
                        },
                    },
                },
                required: ["fields"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "remove_robot_character_field",
            description: "删除机器人的设定字段。如果键存在则删除，不存在则忽略。一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出调用需求后，舍长用自然语言同意后，才能调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    fields: {
                        type: "array",
                        description: "待删除的键名数组",
                        items: {
                            type: "string",
                        },
                    },
                },
                required: ["fields"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "reset_member_description",
            description: "修改某个成员的 description。如果是修改自己的 description，可直接调用；如果是修改他人的，需要经过舍长或目标成员的同意；舍长可直接修改。",
            parameters: {
                type: "object",
                properties: {
                    memberUserId: {
                        // 需要代码检查这个ID是否正确, 就看这个ID是否属于这个宿舍
                        type: "integer",
                        description: "目标用户的 ID（宿舍成员）。例如：“我要修改我的描述”，此 ID 就是发起人自己的 ID；“我要修改张三的描述”，此 ID 就是张三的 ID。",
                    },
                    description: {
                        type: "string",
                        description: "新的描述文本（可对用户的原始描述进行错别字优化）",
                    },
                },
                required: ["memberUserId", "description"],
                additionalProperties: false,
            },
        },
    },
];
```

