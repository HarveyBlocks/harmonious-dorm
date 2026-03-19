# 引入AI, 如何呢?

>  模型采用GLM 4.7 Flash, 开源模型

## CHECK LIST

- [ ] 数据库结构修改

  - [ ] bill_participate里再增加一个weight浮点数字段. weight 在落库前需要归一化.

  - [ ] duty里增加task字段, 用文本描述这个任务的具体工作, 而不是笼统的"值日"

    也就是说, 一天可以有多个人有各自的duties

- [ ] 不改变功能, 提高代码的复用性, 可读性, 进行组件化, 每个文件建议200行左右, 不得超过300行; 每个方法40行左右, 不得超过50行. 不得出现钻石

- [ ] 允许每一个设置卡片进行收缩成一行, 只保留第一行的标题





- [ ] "BASE_URL", "API_KEY", "MODEL" 统统放到配置文件

- [ ] 流式输出吗? 

  - [ ] 不需要了吧? 因为流式输出基于Http, 不基于websocket.
  - [ ] 还是说需要? 能实现最好吧. 

- [ ] 限制输入输出token

- [ ] 限额

  - [ ] 每个宿舍每小时可以使用AI 20 次, 每天可以使用100次 ( 数值待定 TODO )
  - [ ] 限制LLM的token数量

- [ ] Tool call

  - [ ] AI权限设置(舍长可设置, 且仅能手动设置)(在机器人卡)
    - 总是禁止 AI 执行 Tool (访问LLM时从ToolList中删除这个Tool)
    - 总是允许 AI 执行 Tool (访问LLM时, 从ToolList中加入这个Tool)
    - 询问(默认)

  遇到的问题

  - 好多工具都需要一份自己的 ToolList

  - 用户能进行确认吗? 如果能, 怎么布局, 怎么设计? 
    - 使用工具call前, 先让用户进行确认, 检查参数, 然后再进行调用tool并执行
    - 在执行完程序之后, 做一个 undo, 保证能够回溯
      - task_id(一次任务, 多次调用)
      - call_seq
      - method_name
      - parameters(json string)

- [ ] 允许用户设置短期记忆(在机器人)

  增加一个短期记忆长度的设置界面
  - 5-10 简单聊天
  - 10-15 高强度聊天使用, 需要使用 Function Call 的功能
  - 15-20 技术交流
  - 20-30 超活跃群聊

  - [ ] 短期记忆被淘汰后, 会被进行和长期记忆合并, 然后交给AI总结
  - [ ] 短期记忆由messages构成的聊天记录, 由客户端提供(或者进一步封装, 客户端请求聊天个数, 服务端进行消息的获取和聚合), 需要携带, 说话用户名, 用户ID, 说话内容

- [ ] 压缩长期记忆

  - [ ] 对聊天记录的整理概括(一个check point, 来记录, 到目前为止, 几条消息被传输给了AI 让AI完成了总结, 有哪些没有), 是否需要触发自动总结? 每超过n条聊天记录, 自动总结?
  - [ ] 引入增量式的数条聊天记录总结?
  - [ ] 手动压缩: 可以在设置里点击压缩, 然后召唤机器人进行总结, 压缩
  - [ ] 自动压缩: 发现了长期记忆过长, 则机器人对长期记忆进行自动更新压缩(总结)
  - [ ] 自动更新后, 通知舍长

- [ ] 联网搜索(API调用)

- [ ] 整理聊天记录



- [ ] 消息免打扰的功能
  - [ ] 右键(移动界面是长按)左边栏出现菜单栏, 可以设置免打扰
  - [ ] 需要持久化设置
- [ ] 消息的特殊属性
  - [ ] 为了保护隐私. 加一个每条消息上标注一下这条消息是隐私的功能，那就不会为给ai。
    - 需要持久化
  - [ ] 给每条消息，加一个，必须加到ai的这个短记忆上下文里续的功能。
    - 不会持久化
    - 加入到上下文的话，最多不能超过n条(设置的上下文)。
    - 如果使用了指定上下文, 那后端就不会使用维护的窗口
    - 携带这个信息发起@Robot请求后, 这个上下文就不会再启用了, 恢复到默认的窗口
  - [ ] 右键(移动界面是长按)每一条消息，可以出现这两个选项(菜单栏)。
  - [ ] 如果右键不在消息上，而是在背景板上，可以出现一个多选的选项。
  - [ ] 那就可以对后面两个操作进行批量处理了。

## Prompt

> TODO 暂定

```test
你是一个宿舍的群聊助手，需要根据整个对话历史理解用户的最新问题。注意：
- 对话中可能有多人发言，你需要综合所有信息。
- 如果最新问题中缺少明确的时间或地点，请从历史中推理。
- 回答前先思考：用户想查什么？地点？时间？从历史中找线索。
- 回答长度不得超过: 800字. 尽量紧扣用户的问题
- 请直接回答用户问题，不要复述或讨论这些指令。
- 请保守调用Toolcall, 如果参数不能确定, 请优先询问用户, 而不是猜测. (当然, 有些参数是有默认值的, 那就可以调用)
```







## Long Turn Memory



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
      "nowTimestamp": "17321898398",//后端提供, 单位s
      "longMemoryMaxLength": 1111,//后端提供, 保证是和其他地方统一
      // TODO 待丰富
  },
  "longMemory": "长文本, 交给AI总结, Maybe markdown, 可供用户编辑" // 舍长可以修改
}
```





## ToolList

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
            description: "创建值日任务，一般宿舍成员无法调用此工具，只有舍长能执行；或者说，在一般成员提出创建任务后，舍长用自然语言同意后，才能调用此工具。",
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
            description: "总结新记忆，并记录到长记忆配置文件中；如果长记忆文本过长，则总结压缩，保证不超字数。",
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
            description: "修改机器人短期记忆的记忆窗口长度。",
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
            description: "修改机器人的名字，只有在舍长要求调用或经过舍长允许时才可调用。",
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
            description: "增加机器人的设定字段，只有在舍长要求调用或经过舍长允许时才可调用。如果键已存在，则覆盖；不存在则新增。",
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
            description: "删除机器人的设定字段，只有在舍长要求调用或经过舍长允许时才可调用。如果键存在则删除，不存在则忽略。",
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
            name: "get_chat_history",
            description: "获取指定时间点之前的聊天记录，可用于总结、回顾或分析对话内容",
            parameters: {
                type: "object",
                properties: {
                    datetime: {
                        type: "integer",
                        description: "起始时间点，时间戳，单位s。将获取该时间点之前的聊天记录",
                    },
                    count: {
                        type: "integer",
                        description: "需要获取的聊天记录数量，从指定时间点开始向上追溯",
                        minimum: 1,
                        maximum: 100,  // 可以根据实际需求调整上限
                    },
                },
                required: ["datetime", "count"],
                additionalProperties: false,
            },
        },
	}, 
    {
        type: "function",
        function: {
            name: "undo_tool_call",
            description: "对之前的内容进行undo",
            parameters: {
                type: "object",
                properties: {
                    datetime: {
                        type: "integer",
                        description: "起始时间点，时间戳，单位s。将获取该时间点之前的聊天记录",
                    },
                    count: {
                        type: "integer",
                        description: "需要获取的聊天记录数量，从指定时间点开始向上追溯",
                        minimum: 1,
                        maximum: 100,  // 可以根据实际需求调整上限
                    },
                },
                required: ["datetime", "count"],
                additionalProperties: false,
            },
        },
    }
];
```



