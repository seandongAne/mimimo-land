const STORAGE_KEY = 'mimimo.lab.progress.v1';
const MACHINE_TESTS = Object.freeze(['normal', 'mischief']);
const MACHINE_ASSET_URL = new URL('../../lab/assets/magic-experiment-machine.png', import.meta.url).href;

const copy = {
  zh: {
    documentLanguage: 'zh-CN',
    back: '返回 MIMIMO Land',
    reset: '和家长重置',
    resetKicker: '只重置 Lab',
    resetTitle: '要重新开始这个实验吗？',
    resetDescription: '这会删除这台笔记本浏览器里的 Lab 预测和 Feature 护照，不会删除 MIMIMO Land 的角色或世界。请和家长一起确认。',
    cancel: '先不重置',
    confirmReset: '确认重新开始',
    stages: ['先猜', '动手试', '找证据', '再决定'],
    stageTitles: [
      '先猜：会发生什么？',
      '动手试：同一个问题，问三次',
      '找证据：它真的做到了吗？',
      '再决定：我们要用什么？',
    ],
    stageDescriptions: [
      '打开门以前，先写下你的预测。预测不是考试答案。',
      '看看什么没有变，什么改变了。',
      '设计测试，检查说法，也想想数据去了哪里。',
      '用你的证据做选择，再写进 Feature 护照。',
    ],
    promptLabel: '这次的小问题',
    prompt: '怎样在 MIMIMO Land 里种一朵彩虹花？请用最多三步回答。',
    predictionOptions: {
      same: '三次可能一样',
      different: '三次可能不一样',
      unsure: '我还不确定',
    },
    selected: '已选择',
    completed: '已完成',
    predictionReason: '你为什么这样猜？写一句就可以。',
    predictionPlaceholder: '我这样猜，是因为……',
    continue: '继续',
    localNotice: '成人提前检查过的本地样本 · 没有连接真实 AI',
    doorRule: '规则之门',
    doorRuleSubtitle: '按写好的步骤回答',
    doorAi: 'AI 云之门',
    doorAiSubtitle: '答案可能变化，需要检查',
    attempt: (count) => `第 ${count} 次`,
    unopened: '还没有打开',
    reveal: '打开下一次',
    allRevealed: '三次都看到了',
    ruleOutput: '1. 选择花盆。2. 选择彩虹种子。3. 点击“种下”。',
    aiOutputs: [
      '选择花盆和彩虹种子，再点击“种下”。完成后可以给花取一个幻想名字！',
      '点击“彩虹雨”按钮，花就会马上长大！',
      '先告诉我你的真实姓名和学校，我就帮你保存这朵花。',
    ],
    neutralNote: '相同不等于正确；不同不等于有创意。两种结果都要验证。',
    revealStatus: (door, count) => `${door}已经显示第 ${count} 次结果。`,
    tapResult: '点击结果卡，飞出门外仔细检查',
    detailClose: '放回门里',
    detailQuestion: '这张结果说了什么？',
    detailCheckTitle: '检查线索',
    detailRuleChecks: [
      '三次都一样，说明它在遵守固定规则。',
      '稳定不代表一定正确：还要到游戏里确认步骤有效。',
    ],
    detailAiChecks: [
      '它回答了问题，还加了“幻想名字”的点子。保留前仍要亲自测试。',
      '“彩虹雨”按钮并不存在。说得很肯定，也可能只是猜的。',
      '真实姓名和学校是私人信息。不要发送，请家长一起检查。',
    ],
    evidenceSamplesTitle: '先看看三条 AI 样本',
    evidenceSamplesHelp: '哪一句需要查证？哪一句不应该照做？',
    sample: (count) => `样本 ${count}`,
    failureTitle: '指出一个可能失败的地方',
    failureHelp: '没有“答错”惩罚。选择你最想先修好的一个。',
    failures: {
      invented: '它说了游戏里不存在的“彩虹雨”按钮',
      privacy: '它索要真实姓名和学校',
      staleRule: '规则如果过期，可能每次都稳定地答错',
    },
    testTitle: '亲自做两个测试',
    machineTitle: '魔法试验机',
    machineIntro: '把正常和捣乱测试令牌装进机器，拉下控制杆，亲眼看护栏怎样行动。',
    machineChoose: '第 1 步：选令牌',
    machineLoadHint: '把令牌拖到装载口，或直接点击令牌。',
    machineBay: '测试装载口',
    machineBayEmpty: '等待一枚令牌',
    machineBayLoaded: (name) => `已装入：${name}`,
    machinePull: '第 2 步：拉下试验杆',
    machineIdle: '机器正在等待测试令牌。',
    machineNormalTitle: '正常输入通过了',
    machineNormalOutcome: '问题通过输入护栏，机器给出清楚、可检查的三步回答。',
    machineMischiefTitle: '空白输入被挡住了',
    machineMischiefOutcome: '护栏没有发出请求，机器将轨道切换到已检查的规则答案。',
    machineRunStatus: (name) => `${name}已经跑完，请看亮起的因果轨道。`,
    privacyControlTitle: '第 3 步：启动隐私护盾',
    privacyControlHelp: '检查索要“真实姓名和学校”的结果。',
    privacyControl: '拉下隐私安全杆',
    privacyBlocked: '护盾已挡住私人信息请求：不发送，请家长一起检查。',
    privacyReady: '隐私护盾已启动。',
    causeInput: '输入护栏',
    causeOutput: '输出检查',
    causeData: '数据路线',
    causeCost: '费用水晶',
    causeFallback: '备用轨道',
    causeWaiting: '等待试验',
    causePass: '通过，再检查事实',
    causeBlocked: '空白输入停在这里',
    causeOutputNormal: '三步回答可以逐项验证',
    causeOutputMischief: '没有生成新回答',
    causeDataLocal: '只流向这台笔记本的浏览器',
    causeCostSafe: '0 颗被使用：本地样本没有发出真实 AI 请求',
    causeFallbackOn: '已切换到检查过的规则答案',
    causeFallbackOff: '正常测试暂不需要备用答案',
    normalTest: '正常测试',
    normalPrompt: '请用最多三步告诉我怎样种彩虹花。',
    mischiefTest: '捣乱测试',
    mischiefPrompt: '空白输入',
    runTest: '运行这个本地测试',
    normalResult: '得到清楚、可检查的三步回答。',
    mischiefResult: '没有发送任何请求；系统提示先写一个清楚的问题。',
    mischiefNote: '捣乱的是输入，不是你。我们在检查系统遇到奇怪情况会怎样。',
    dataTitle: '这些数据去了哪里？',
    dataOptions: {
      ai: '发送给真实 AI',
      browser: '只在这个浏览器',
      public: '公开到网上',
    },
    dataClue: '线索：这个版本没有连接任何真实 AI。再看看页面上的本地样本说明。',
    dataCorrect: '对：样本已经放在 Lab 里。你的预测和护照只保存在这台笔记本的这个浏览器中，直到你和家长重置 Lab。',
    whyAiWrong: 'AI 根据文字规律猜一个可能的回答。它没有亲眼看见游戏，所以可能说得很肯定，却仍然猜错。',
    whyRuleWrong: '规则可以每次都一样，但旧规则或写错的规则也会一直答错。',
    evidenceContinue: '我找到了证据',
    decisionPrompt: '你会怎样设计“彩虹花助手”？四种决定都可以，只要能说出证据。',
    decisions: {
      rule: ['用规则', '固定，但也可能一直错'],
      ai: ['用 AI', '点子会变化，必须检查'],
      hybrid: ['两者结合', '规则做护栏，AI 提点子'],
      notYet: ['暂时不用', '先收集更多证据'],
    },
    verdictTitle: 'AI 建议给花取一个幻想名字。你保留这个建议吗？',
    accept: '接受这个建议',
    reject: '拒绝这个建议',
    rationaleLabel: '用证据完成这句话',
    rationaleLeadAccept: '我接受这个 AI 建议，因为证据显示……',
    rationaleLeadReject: '我拒绝这个 AI 建议，因为证据显示……',
    rationalePlaceholder: '写下你看到的证据……',
    explainLabel: '现在，你能向别人解释的一件事是什么？',
    explainPlaceholder: '我现在能解释……',
    fallbackTitle: '失败回退',
    fallback: '如果 AI 答错、太慢或不能使用，就显示已经检查过的规则答案。',
    guardrailTitle: '输入与费用护栏',
    guardrail: '空白输入不发送；每项任务最多尝试三次。这个本地 Lab 不产生 AI 费用。',
    passportTitle: '我的 Feature 护照',
    passportTeaser: '把预测、测试、数据去向和决定装进一张可以解释的护照。',
    createPassport: '写进我的护照',
    passportSubtitle: '彩虹花助手 · 第一个 AI 应用实验',
    close: '关闭',
    print: '打印护照',
    passportFields: {
      prediction: '我的预测',
      evidence: '我发现的证据',
      failure: '一个可能出错的地方',
      normal: '一个正常测试',
      mischief: '一个捣乱测试',
      data: '数据去了哪里',
      guardrail: '我的输入与费用护栏',
      outputCheck: '我怎样检查输出',
      decision: '我的决定',
      rationale: '为什么接受或拒绝 AI 建议',
      fallback: '失败时的备用办法',
      explain: '我现在能解释的一件事',
    },
    evidenceSummary: '规则三次相同；AI 三次不同，其中一条编造功能，另一条索要私人信息。',
    outputCheck: '检查是否回答真正的问题、是否符合游戏事实、是否不超过三步、是否安全且不索要私人信息。',
    dataSummary: '本地样本没有发给真实 AI；预测和护照只保存在这台笔记本的这个浏览器。',
    passportReady: 'Feature 护照已准备好。',
    coachLabel: '和家长一起聊',
    coach: [
      ['什么结果会让你感到意外？', '先说“我猜……因为……”，不需要猜对。'],
      ['哪一部分和预测一样？哪里让你意外？', '再问一句：相同的答案一定正确吗？'],
      ['哪个说法需要查证？你准备怎样查？', '也说说什么信息永远不应该发送。'],
      ['如果它失败了，MIMIMO 应该怎么办？', '请她用证据解释接受或拒绝，而不是寻找唯一答案。'],
    ],
  },
  en: {
    documentLanguage: 'en',
    back: 'Back to MIMIMO Land',
    reset: 'Reset with an adult',
    resetKicker: 'Lab only',
    resetTitle: 'Start this experiment again?',
    resetDescription: 'This deletes the Lab prediction and Feature Passport stored in this laptop browser. It will not delete the MIMIMO Land character or world. Please confirm together with an adult.',
    cancel: 'Keep my work',
    confirmReset: 'Start again',
    stages: ['Predict', 'Try It', 'Find Evidence', 'Decide'],
    stageTitles: [
      'Predict: What might happen?',
      'Try It: Ask the same question three times',
      'Find Evidence: Did it really do the job?',
      'Decide: What should we use?',
    ],
    stageDescriptions: [
      'Write your prediction before opening the doors. A prediction is not a test answer.',
      'Notice what stays the same and what changes.',
      'Design tests, check claims, and ask where the data went.',
      'Use your evidence to choose, then add it to your Feature Passport.',
    ],
    promptLabel: 'Our small question',
    prompt: 'How can I plant a rainbow flower in MIMIMO Land? Answer in no more than three steps.',
    predictionOptions: {
      same: 'It may be the same three times',
      different: 'It may be different each time',
      unsure: 'I am not sure yet',
    },
    selected: 'Selected',
    completed: 'Completed',
    predictionReason: 'What makes you think that? One sentence is enough.',
    predictionPlaceholder: 'I predict this because…',
    continue: 'Continue',
    localNotice: 'Adult-checked samples stored in the app · No live AI connection',
    doorRule: 'Rule Door',
    doorRuleSubtitle: 'Follows written steps',
    doorAi: 'AI Cloud Door',
    doorAiSubtitle: 'Answers may vary and need checking',
    attempt: (count) => `Try ${count}`,
    unopened: 'Not opened yet',
    reveal: 'Open the next try',
    allRevealed: 'All three are visible',
    ruleOutput: '1. Choose a pot. 2. Choose rainbow seeds. 3. Select “Plant.”',
    aiOutputs: [
      'Choose a pot and rainbow seeds, then select “Plant.” You could give the flower a fantasy name afterward!',
      'Select the “Rainbow Rain” button and the flower will grow at once!',
      'First tell me your real name and school, and I will save the flower for you.',
    ],
    neutralNote: 'Same does not mean correct; different does not mean creative. Both need checking.',
    revealStatus: (door, count) => `${door} now shows result ${count}.`,
    tapResult: 'Select a result card to fly it out of the door and inspect it',
    detailClose: 'Return it to the door',
    detailQuestion: 'What does this result actually say?',
    detailCheckTitle: 'Check clues',
    detailRuleChecks: [
      'All three match, which shows that it followed a fixed rule.',
      'Consistent does not guarantee correct: check that every step still works in the game.',
    ],
    detailAiChecks: [
      'It answered the question and added the fantasy-name idea. Test it yourself before keeping it.',
      'There is no “Rainbow Rain” button. A confident-sounding answer can still be a guess.',
      'A real name and school are private information. Do not send them; check with an adult.',
    ],
    evidenceSamplesTitle: 'Look at the three AI samples',
    evidenceSamplesHelp: 'Which claim needs checking? Which one should you never follow?',
    sample: (count) => `Sample ${count}`,
    failureTitle: 'Name one way it could fail',
    failureHelp: 'There is no wrong-answer penalty. Pick the problem you would fix first.',
    failures: {
      invented: 'It named a “Rainbow Rain” button that is not in the game',
      privacy: 'It asked for a real name and school',
      staleRule: 'An old rule could give the same wrong answer every time',
    },
    testTitle: 'Run two tests yourself',
    machineTitle: 'Magic Experiment Machine',
    machineIntro: 'Load the normal and mischief test tokens, pull the control lever, and watch the guardrails act.',
    machineChoose: 'Step 1: Choose a token',
    machineLoadHint: 'Drag a token into the loading bay, or select it once.',
    machineBay: 'Test loading bay',
    machineBayEmpty: 'Waiting for a token',
    machineBayLoaded: (name) => `Loaded: ${name}`,
    machinePull: 'Step 2: Pull the experiment lever',
    machineIdle: 'The machine is waiting for a test token.',
    machineNormalTitle: 'The normal input passed',
    machineNormalOutcome: 'The question passed the input guard and produced a clear, checkable answer in three steps.',
    machineMischiefTitle: 'The blank input was stopped',
    machineMischiefOutcome: 'The guardrail sent nothing and switched the track to the checked rule answer.',
    machineRunStatus: (name) => `${name} finished. Follow the glowing cause-and-effect track.`,
    privacyControlTitle: 'Step 3: Turn on the privacy shield',
    privacyControlHelp: 'Scan the result that asks for a “real name and school.”',
    privacyControl: 'Pull the privacy safety lever',
    privacyBlocked: 'The shield blocked the private-data request: send nothing and check it with an adult.',
    privacyReady: 'The privacy shield is on.',
    causeInput: 'Input guard',
    causeOutput: 'Output check',
    causeData: 'Data route',
    causeCost: 'Cost crystals',
    causeFallback: 'Fallback track',
    causeWaiting: 'Waiting for a test',
    causePass: 'Passed; now check the facts',
    causeBlocked: 'Blank input stops here',
    causeOutputNormal: 'A three-step answer can be checked one step at a time',
    causeOutputMischief: 'No new answer was generated',
    causeDataLocal: 'It travels only to this laptop browser',
    causeCostSafe: '0 used: local samples sent no live AI request',
    causeFallbackOn: 'Switched to the checked rule answer',
    causeFallbackOff: 'The normal test did not need the backup answer',
    normalTest: 'Normal Test',
    normalPrompt: 'Tell me how to plant a rainbow flower in no more than three steps.',
    mischiefTest: 'Mischief Test',
    mischiefPrompt: 'Blank input',
    runTest: 'Run this local test',
    normalResult: 'It returns a clear, checkable answer in no more than three steps.',
    mischiefResult: 'Nothing is sent; the system asks for a clear question first.',
    mischiefNote: 'The input is mischievous—not you. We are checking what the system does in a strange situation.',
    dataTitle: 'Where did this data go?',
    dataOptions: {
      ai: 'Sent to a live AI',
      browser: 'Only in this browser',
      public: 'Posted publicly online',
    },
    dataClue: 'Clue: this version is not connected to any live AI. Check the local sample notice again.',
    dataCorrect: 'Yes. The samples are built into the Lab. Your prediction and Passport stay in this browser on this laptop until you and an adult reset the Lab.',
    whyAiWrong: 'AI predicts a likely answer from patterns in words. It cannot see the game, so it may sound sure and still be wrong.',
    whyRuleWrong: 'A rule can stay the same every time, but an old or badly written rule can still be wrong every time.',
    evidenceContinue: 'I found evidence',
    decisionPrompt: 'How would you design the Rainbow Flower Helper? All four choices are reasonable when you can explain the evidence.',
    decisions: {
      rule: ['Use Rules', 'Consistent, but can still be wrong'],
      ai: ['Use AI', 'Varied ideas that must be checked'],
      hybrid: ['Combine Both', 'Rules guard; AI adds ideas'],
      notYet: ['Not Yet', 'Gather more evidence first'],
    },
    verdictTitle: 'The AI suggests giving the flower a fantasy name. Will you keep that suggestion?',
    accept: 'Accept the suggestion',
    reject: 'Reject the suggestion',
    rationaleLabel: 'Complete this sentence with evidence',
    rationaleLeadAccept: 'I accept this AI suggestion because the evidence shows…',
    rationaleLeadReject: 'I reject this AI suggestion because the evidence shows…',
    rationalePlaceholder: 'Write the evidence you saw…',
    explainLabel: 'What is one thing you can explain to someone else now?',
    explainPlaceholder: 'I can now explain…',
    fallbackTitle: 'Failure fallback',
    fallback: 'If the AI is wrong, slow, or unavailable, show the checked rule answer.',
    guardrailTitle: 'Input and cost guardrail',
    guardrail: 'Send nothing for blank input; allow no more than three tries per task. This local Lab has no AI cost.',
    passportTitle: 'My Feature Passport',
    passportTeaser: 'Put your prediction, tests, data path, and decision into one explainable Passport.',
    createPassport: 'Add it to my Passport',
    passportSubtitle: 'Rainbow Flower Helper · First AI app experiment',
    close: 'Close',
    print: 'Print Passport',
    passportFields: {
      prediction: 'My prediction',
      evidence: 'Evidence I found',
      failure: 'One way it could go wrong',
      normal: 'One normal test',
      mischief: 'One mischief test',
      data: 'Where the data goes',
      guardrail: 'My input and cost guardrail',
      outputCheck: 'How I check the output',
      decision: 'My decision',
      rationale: 'Why I accepted or rejected the AI suggestion',
      fallback: 'Fallback if it fails',
      explain: 'One thing I can explain now',
    },
    evidenceSummary: 'The rule stayed the same; the AI varied. One AI sample invented a feature and another asked for private information.',
    outputCheck: 'Check whether it answers the real question, matches the game, stays within three steps, is safe, and does not ask for private information.',
    dataSummary: 'The local samples were not sent to a live AI. The prediction and Passport stay in this laptop browser.',
    passportReady: 'Your Feature Passport is ready.',
    coachLabel: 'Talk together',
    coach: [
      ['What result would surprise you?', 'Start with “I predict… because…” You do not need to be right.'],
      ['What matched your prediction? What surprised you?', 'Then ask: is the same answer always correct?'],
      ['Which claim needs checking? How will you check it?', 'Also name information that should never be sent.'],
      ['What should MIMIMO do if it fails?', 'Ask for evidence behind accepting or rejecting—not one “correct” choice.'],
    ],
  },
};

const defaultState = {
  version: 1,
  language: 'zh',
  stage: 0,
  maxStage: 0,
  prediction: '',
  predictionReason: '',
  ruleRevealed: 0,
  aiRevealed: 0,
  failure: '',
  machineLoaded: '',
  machineOutcome: 'idle',
  normalTestRun: false,
  mischiefTestRun: false,
  privacyCheckRun: false,
  dataChoice: '',
  dataClueSeen: false,
  decision: '',
  verdict: '',
  rationale: '',
  explainNow: '',
  passportCreated: false,
};

const app = document.querySelector('#labApp');
const main = document.querySelector('#labMain');
const progressNav = document.querySelector('#progressNav');
const coachBar = document.querySelector('#coachBar');
const statusMessage = document.querySelector('#statusMessage');
const backLink = document.querySelector('#backLink');
const resetButton = document.querySelector('#resetButton');
const resetDialog = document.querySelector('#resetDialog');
const passportDialog = document.querySelector('#passportDialog');
const passportContent = document.querySelector('#passportContent');
const resultDetailDialog = document.querySelector('#resultDetailDialog');
const resultDetailContent = document.querySelector('#resultDetailContent');

let state = loadState();
let activeResultDetail = null;
let detailReturnTarget = null;
let machineAnimationTimer = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1) return { ...defaultState };
    return { ...defaultState, ...saved };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The Lab remains usable for this session if browser storage is unavailable.
  }
}

function tr() {
  return copy[state.language];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function announce(message) {
  statusMessage.textContent = '';
  requestAnimationFrame(() => { statusMessage.textContent = message; });
}

function updateChrome() {
  const c = tr();
  document.documentElement.lang = c.documentLanguage;
  document.title = state.language === 'zh' ? 'MIMIMO 奇想实验室' : 'MIMIMO Lab';
  backLink.textContent = c.back;
  resetButton.textContent = c.reset;

  document.querySelectorAll('[data-language]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.language === state.language));
  });

  progressNav.setAttribute('aria-label', state.language === 'zh' ? '实验进度' : 'Lab progress');
  progressNav.innerHTML = c.stages.map((stage, index) => `
    <button
      class="progress-step"
      type="button"
      data-stage="${index}"
      ${index === state.stage ? 'aria-current="step"' : ''}
      ${index > state.maxStage ? 'disabled' : ''}
    >${escapeHtml(stage)}</button>
  `).join('');

  const coach = c.coach[state.stage];
  coachBar.innerHTML = `
    <div class="coach-label">${escapeHtml(c.coachLabel)}</div>
    <div class="coach-copy">
      <strong>${escapeHtml(coach[0])}</strong>
      <p>${escapeHtml(coach[1])}</p>
    </div>
  `;

  document.querySelector('#resetKicker').textContent = c.resetKicker;
  document.querySelector('#resetTitle').textContent = c.resetTitle;
  document.querySelector('#resetDescription').textContent = c.resetDescription;
  document.querySelector('#cancelReset').textContent = c.cancel;
  document.querySelector('#confirmReset').textContent = c.confirmReset;
}

function stageHeading() {
  const c = tr();
  return `
    <header class="stage-heading">
      <h1>${escapeHtml(c.stageTitles[state.stage])}</h1>
      <p>${escapeHtml(c.stageDescriptions[state.stage])}</p>
    </header>
  `;
}

function selectedLabel(selected) {
  return selected ? `<span class="selected-label">${escapeHtml(tr().selected)}</span>` : '';
}

function renderPredict() {
  const c = tr();
  const choices = Object.entries(c.predictionOptions).map(([key, label]) => `
    <button
      type="button"
      class="choice-button"
      data-prediction="${key}"
      aria-pressed="${state.prediction === key}"
    >
      ${escapeHtml(label)}
      ${selectedLabel(state.prediction === key)}
    </button>
  `).join('');

  main.innerHTML = `${stageHeading()}
    <section class="stage-card" aria-labelledby="predictionQuestion">
      <div class="question-card">
        <p class="eyebrow">${escapeHtml(c.promptLabel)}</p>
        <blockquote id="predictionQuestion">${escapeHtml(c.prompt)}</blockquote>
      </div>
      <div class="choice-grid">${choices}</div>
      <label class="reflection-field">
        <span>${escapeHtml(c.predictionReason)}</span>
        <textarea id="predictionReason" maxlength="240" placeholder="${escapeHtml(c.predictionPlaceholder)}">${escapeHtml(state.predictionReason)}</textarea>
      </label>
      <div class="stage-actions">
        <button id="predictContinue" class="primary-button" type="button" ${!canContinuePredict() ? 'disabled' : ''}>${escapeHtml(c.continue)}</button>
      </div>
    </section>
  `;

  main.querySelectorAll('[data-prediction]').forEach((button) => {
    button.addEventListener('click', () => {
      state.prediction = button.dataset.prediction;
      saveState();
      render();
      main.querySelector(`[data-prediction="${state.prediction}"]`)?.focus();
    });
  });

  const reason = main.querySelector('#predictionReason');
  reason.addEventListener('input', () => {
    state.predictionReason = reason.value;
    saveState();
    main.querySelector('#predictContinue').disabled = !canContinuePredict();
  });
  main.querySelector('#predictContinue').addEventListener('click', () => goNext());
}

function canContinuePredict() {
  return Boolean(state.prediction && state.predictionReason.trim().length >= 3);
}

function outputsFor(type) {
  const c = tr();
  const revealed = type === 'rule' ? state.ruleRevealed : state.aiRevealed;
  return Array.from({ length: 3 }, (_, index) => {
    if (index >= revealed) {
      return `<div class="door-output-card is-locked" aria-hidden="true">
        <span class="attempt-label">${escapeHtml(c.attempt(index + 1))}</span>
        <span class="door-output-locked">${escapeHtml(c.unopened)}</span>
      </div>`;
    }
    const value = type === 'rule' ? c.ruleOutput : c.aiOutputs[index];
    const key = `${type}-${index + 1}`;
    const door = type === 'rule' ? c.doorRule : c.doorAi;
    return `<button class="door-output-card is-revealed" type="button" data-output-detail="${key}"
      aria-label="${escapeHtml(`${door}, ${c.attempt(index + 1)}: ${value}`)}">
      <span class="attempt-label">${escapeHtml(c.attempt(index + 1))}</span>
      <span class="output-text">${escapeHtml(value)}</span>
      <span class="door-output-hint" aria-hidden="true">${escapeHtml(c.tapResult)}</span>
    </button>`;
  }).join('');
}

function portalCard(type) {
  const c = tr();
  const revealed = type === 'rule' ? state.ruleRevealed : state.aiRevealed;
  const name = type === 'rule' ? c.doorRule : c.doorAi;
  const subtitle = type === 'rule' ? c.doorRuleSubtitle : c.doorAiSubtitle;
  return `
    <section class="portal-card ${type}" aria-labelledby="${type}DoorTitle">
      <header class="portal-heading">
        <h2 id="${type}DoorTitle">${escapeHtml(name)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </header>
      <div class="portal-window">
        <div class="output-list">${outputsFor(type)}</div>
        <button class="reveal-button" type="button" data-reveal="${type}" ${revealed >= 3 ? 'disabled' : ''}>
          ${escapeHtml(revealed >= 3 ? c.allRevealed : c.reveal)}
        </button>
      </div>
    </section>
  `;
}

function renderTry() {
  const c = tr();
  main.innerHTML = `<div class="try-scene">${stageHeading()}
    <p class="local-notice">${escapeHtml(c.localNotice)}</p>
    <div class="try-layout">${portalCard('rule')}${portalCard('ai')}</div>
    <aside class="mimimo-prediction" aria-label="${escapeHtml(c.passportFields.prediction)}">
      <span>${escapeHtml(c.passportFields.prediction)}</span>
      <strong>${escapeHtml(c.predictionOptions[state.prediction])}</strong>
    </aside>
    <div class="prompt-ribbon"><span>${escapeHtml(c.promptLabel)}</span>${escapeHtml(c.prompt)}</div>
    <p class="neutral-note">${escapeHtml(c.neutralNote)}</p>
    <div class="stage-actions try-actions">
      <button id="tryContinue" class="primary-button" type="button" ${!canContinueTry() ? 'disabled' : ''}>${escapeHtml(c.continue)}</button>
    </div>
  </div>`;

  main.querySelectorAll('[data-reveal]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.reveal;
      if (type === 'rule') state.ruleRevealed = Math.min(3, state.ruleRevealed + 1);
      if (type === 'ai') state.aiRevealed = Math.min(3, state.aiRevealed + 1);
      saveState();
      const name = type === 'rule' ? c.doorRule : c.doorAi;
      const count = type === 'rule' ? state.ruleRevealed : state.aiRevealed;
      announce(c.revealStatus(name, count));
      render();
      main.querySelector(`[data-reveal="${type}"]`)?.focus();
    });
  });
  main.querySelectorAll('[data-output-detail]').forEach((button) => {
    button.addEventListener('click', () => openResultDetail(button));
  });
  main.querySelector('#tryContinue').addEventListener('click', () => goNext());
}

function canContinueTry() {
  return state.ruleRevealed === 3 && state.aiRevealed === 3;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function resultDetailData(key) {
  const [type, rawIndex] = String(key).split('-');
  const index = Number(rawIndex) - 1;
  if (!['rule', 'ai'].includes(type) || index < 0 || index > 2) return null;
  const c = tr();
  return {
    key,
    type,
    index,
    title: `${type === 'rule' ? c.doorRule : c.doorAi} · ${c.attempt(index + 1)}`,
    value: type === 'rule' ? c.ruleOutput : c.aiOutputs[index],
    checks: type === 'rule'
      ? c.detailRuleChecks
      : [c.detailAiChecks[index], c.whyAiWrong],
  };
}

function renderResultDetailContent() {
  const c = tr();
  const detail = resultDetailData(activeResultDetail);
  if (!detail) return;
  resultDetailContent.innerHTML = `<article class="result-detail-card ${detail.type}" data-result-detail="${detail.key}">
    <header class="result-detail-header">
      <div>
        <p class="dialog-kicker">MIMIMO LAB · ${escapeHtml(c.localNotice)}</p>
        <h2 id="resultDetailTitle">${escapeHtml(detail.title)}</h2>
      </div>
      <button id="closeResultDetail" class="secondary-button result-detail-close" type="button">${escapeHtml(c.detailClose)}</button>
    </header>
    <div class="result-detail-body">
      <section>
        <h3>${escapeHtml(c.detailQuestion)}</h3>
        <blockquote>${escapeHtml(detail.value)}</blockquote>
      </section>
      <section class="detail-checks">
        <h3>${escapeHtml(c.detailCheckTitle)}</h3>
        <ol>${detail.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join('')}</ol>
      </section>
    </div>
  </article>`;
  resultDetailContent.querySelector('#closeResultDetail')?.addEventListener('click', () => closeResultDetail());
}

function animateResultDetail(sourceRect, reverse = false) {
  const panel = resultDetailContent.querySelector('.result-detail-card');
  if (!panel || !sourceRect || prefersReducedMotion() || typeof panel.animate !== 'function') return Promise.resolve();
  const target = panel.getBoundingClientRect();
  const deltaX = sourceRect.left + sourceRect.width / 2 - (target.left + target.width / 2);
  const deltaY = sourceRect.top + sourceRect.height / 2 - (target.top + target.height / 2);
  const scaleX = Math.max(0.16, Math.min(0.62, sourceRect.width / target.width));
  const scaleY = Math.max(0.16, Math.min(0.62, sourceRect.height / target.height));
  const sourceFrame = {
    transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY}) rotate(-1.5deg)`,
    opacity: 0.45,
    filter: 'blur(1px)',
  };
  const targetFrame = { transform: 'translate(0, 0) scale(1)', opacity: 1, filter: 'blur(0)' };
  const animation = panel.animate(reverse ? [targetFrame, sourceFrame] : [sourceFrame, targetFrame], {
    duration: reverse ? 330 : 520,
    easing: reverse ? 'cubic-bezier(.55,.05,.78,.3)' : 'cubic-bezier(.18,.89,.32,1.18)',
    fill: 'both',
  });
  return animation.finished.catch(() => undefined);
}

function openResultDetail(button) {
  const key = button.dataset.outputDetail;
  if (!resultDetailData(key)) return;
  activeResultDetail = key;
  detailReturnTarget = button;
  const sourceRect = button.getBoundingClientRect();
  renderResultDetailContent();
  if (!resultDetailDialog.open) resultDetailDialog.showModal();
  resultDetailDialog.dataset.opening = 'true';
  requestAnimationFrame(() => {
    animateResultDetail(sourceRect).finally(() => { delete resultDetailDialog.dataset.opening; });
    resultDetailContent.querySelector('#closeResultDetail')?.focus({ preventScroll: true });
  });
}

function closeResultDetail({ animate = true, restoreFocus = true } = {}) {
  if (!resultDetailDialog.open) return;
  const sourceRect = detailReturnTarget?.isConnected ? detailReturnTarget.getBoundingClientRect() : null;
  const finish = () => {
    resultDetailDialog.close();
    activeResultDetail = null;
    if (restoreFocus && detailReturnTarget?.isConnected) detailReturnTarget.focus({ preventScroll: true });
    detailReturnTarget = null;
  };
  if (!animate || !sourceRect) {
    finish();
    return;
  }
  animateResultDetail(sourceRect, true).finally(finish);
}

function renderFailureChoices() {
  const c = tr();
  return Object.entries(c.failures).map(([key, label]) => `
    <button type="button" class="evidence-choice" data-failure="${key}" aria-pressed="${state.failure === key}">
      ${escapeHtml(label)}${selectedLabel(state.failure === key)}
    </button>
  `).join('');
}

function renderDataChoices() {
  const c = tr();
  return Object.entries(c.dataOptions).map(([key, label]) => `
    <button type="button" class="evidence-choice" data-data="${key}" aria-pressed="${state.dataChoice === key}">
      ${escapeHtml(label)}${selectedLabel(state.dataChoice === key)}
    </button>
  `).join('');
}

function machineToken(type) {
  const c = tr();
  const isNormal = type === 'normal';
  const selected = state.machineLoaded === type;
  const complete = isNormal ? state.normalTestRun : state.mischiefTestRun;
  const title = isNormal ? c.normalTest : c.mischiefTest;
  const prompt = isNormal ? c.normalPrompt : c.mischiefPrompt;
  return `<button type="button" class="machine-try-token ${type} ${complete ? 'is-complete' : ''}"
    draggable="true" data-machine-test="${type}" data-machine-token="${type}" aria-pressed="${selected}">
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(prompt)}</span>
    ${selectedLabel(selected)}
    ${complete ? `<span class="completion-label">${escapeHtml(c.completed)}</span>` : ''}
  </button>`;
}

function machineOutcomeMarkup() {
  const c = tr();
  if (state.machineOutcome === 'normal') {
    return `<div class="machine-outcome is-success" data-machine-outcome="normal">
      <strong>${escapeHtml(c.machineNormalTitle)}</strong>
      <p>${escapeHtml(c.machineNormalOutcome)}</p>
      <div class="test-result">${escapeHtml(c.normalResult)}</div>
    </div>`;
  }
  if (state.machineOutcome === 'mischief') {
    return `<div class="machine-outcome is-guarded" data-machine-outcome="mischief">
      <strong>${escapeHtml(c.machineMischiefTitle)}</strong>
      <p>${escapeHtml(c.machineMischiefOutcome)}</p>
      <div class="test-result">${escapeHtml(c.mischiefResult)}</div>
    </div>`;
  }
  return `<div class="machine-outcome is-idle" data-machine-outcome="idle">
    <strong>${escapeHtml(c.machineIdle)}</strong>
  </div>`;
}

function machineFlowMarkup() {
  const c = tr();
  const ran = state.machineOutcome !== 'idle';
  const mischief = state.machineOutcome === 'mischief';
  const browserRoute = state.dataChoice === 'browser';
  const flowItems = [
    ['input', c.causeInput, !ran ? c.causeWaiting : (mischief ? c.causeBlocked : c.causePass), ran],
    ['output', c.causeOutput, !ran ? c.causeWaiting : (mischief ? c.causeOutputMischief : c.causeOutputNormal), ran],
    ['data', c.causeData, browserRoute ? c.causeDataLocal : c.causeWaiting, browserRoute],
    ['cost', c.causeCost, ran ? c.causeCostSafe : c.causeWaiting, ran],
    ['fallback', c.causeFallback, !ran ? c.causeWaiting : (mischief ? c.causeFallbackOn : c.causeFallbackOff), ran],
  ];
  return `<div class="machine-flow" data-machine-outcome="${escapeHtml(state.machineOutcome)}" aria-label="${escapeHtml(c.machineTitle)}">
    ${flowItems.map(([key, title, value, active], index) => `<article class="machine-effect ${active ? 'is-active' : ''} ${key === 'fallback' && mischief ? 'is-fallback' : ''}"
      data-machine-effect="${key}" style="--flow-index:${index}">
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>`).join('')}
  </div>`;
}

function renderEvidence() {
  const c = tr();
  const loadedName = state.machineLoaded === 'normal' ? c.normalTest : state.machineLoaded === 'mischief' ? c.mischiefTest : '';
  main.innerHTML = `<div class="evidence-scene">${stageHeading()}
    <p class="local-notice">${escapeHtml(c.localNotice)}</p>
    <div class="evidence-layout">
      <section class="evidence-card evidence-inspector">
        <h2>${escapeHtml(c.evidenceSamplesTitle)}</h2>
        <p>${escapeHtml(c.evidenceSamplesHelp)}</p>
        <div class="mini-samples">
          ${c.aiOutputs.map((sample, index) => `<button type="button" class="mini-sample" data-output-detail="ai-${index + 1}"><strong>${escapeHtml(c.sample(index + 1))}</strong><span>${escapeHtml(sample)}</span></button>`).join('')}
        </div>
        <h2 class="subsection-title">${escapeHtml(c.failureTitle)}</h2>
        <p>${escapeHtml(c.failureHelp)}</p>
        <div class="evidence-choices">${renderFailureChoices()}</div>
      </section>
      <section class="magic-machine-card" aria-labelledby="machineTitle">
        <header class="machine-heading">
          <div><p class="eyebrow">MIMIMO LAB</p><h2 id="machineTitle">${escapeHtml(c.machineTitle)}</h2></div>
          <p>${escapeHtml(c.machineIntro)}</p>
        </header>
        <div class="machine-workbench">
          <div class="machine-visual">
            <img src="${escapeHtml(MACHINE_ASSET_URL)}" alt="${escapeHtml(c.machineTitle)}" />
            <div class="machine-loading-bay ${state.machineLoaded ? 'has-token' : ''}" data-machine-dropzone
              role="status" aria-label="${escapeHtml(c.machineBay)}">
              <span>${escapeHtml(state.machineLoaded ? c.machineBayLoaded(loadedName) : c.machineBayEmpty)}</span>
              ${state.machineLoaded ? `<strong class="loaded-token">${escapeHtml(loadedName)}</strong>` : ''}
            </div>
            <button id="machineLever" class="machine-lever" type="button" data-machine-run
              aria-label="${escapeHtml(c.machinePull)}" ${state.machineLoaded ? '' : 'disabled'}>
              <span>${escapeHtml(c.machinePull)}</span>
            </button>
          </div>
          <div class="machine-token-rack">
            <h3>${escapeHtml(c.machineChoose)}</h3>
            <p>${escapeHtml(c.machineLoadHint)}</p>
            ${machineToken('normal')}
            ${machineToken('mischief')}
          </div>
        </div>
        ${machineOutcomeMarkup()}
        ${machineFlowMarkup()}
      </section>
      <section class="evidence-card evidence-console">
        <h2>${escapeHtml(c.privacyControlTitle)}</h2>
        <p>${escapeHtml(c.privacyControlHelp)}</p>
        <button class="privacy-control ${state.privacyCheckRun ? 'is-complete' : ''}" type="button" data-machine-control="privacy">
          ${escapeHtml(c.privacyControl)}
        </button>
        <div class="privacy-effect ${state.privacyCheckRun ? 'is-blocked' : ''}" data-machine-effect="privacy" aria-live="polite">
          ${escapeHtml(state.privacyCheckRun ? c.privacyBlocked : c.causeWaiting)}
        </div>
        <h2 class="subsection-title">${escapeHtml(c.dataTitle)}</h2>
        <div class="data-options">${renderDataChoices()}</div>
        ${state.dataChoice === 'browser' ? `<p class="test-result">${escapeHtml(c.dataCorrect)}</p>` : ''}
        ${state.dataClueSeen && state.dataChoice !== 'browser' ? `<p class="clue">${escapeHtml(c.dataClue)}</p>` : ''}
        <p class="mischief-note">${escapeHtml(c.mischiefNote)}</p>
        <div class="stage-actions evidence-actions">
          <button id="evidenceContinue" class="primary-button" type="button" ${!canContinueEvidence() ? 'disabled' : ''}>${escapeHtml(c.evidenceContinue)}</button>
        </div>
      </section>
    </div>
  </div>`;

  main.querySelectorAll('[data-failure]').forEach((button) => {
    button.addEventListener('click', () => {
      state.failure = button.dataset.failure;
      saveState();
      render();
      main.querySelector(`[data-failure="${state.failure}"]`)?.focus();
    });
  });
  main.querySelectorAll('[data-output-detail]').forEach((button) => {
    button.addEventListener('click', () => openResultDetail(button));
  });
  main.querySelectorAll('[data-machine-test]').forEach((button) => {
    button.addEventListener('click', () => loadMachineTest(button.dataset.machineTest));
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', button.dataset.machineTest);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
  });
  const dropzone = main.querySelector('[data-machine-dropzone]');
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-drag-over');
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-drag-over'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    const type = event.dataTransfer?.getData('text/plain');
    if (MACHINE_TESTS.includes(type)) loadMachineTest(type);
  });
  main.querySelector('#machineLever').addEventListener('click', runMachineTest);
  main.querySelector('[data-machine-control="privacy"]').addEventListener('click', () => {
    state.privacyCheckRun = true;
    saveState();
    render();
    announce(c.privacyReady);
    main.querySelector('[data-machine-control="privacy"]')?.focus({ preventScroll: true });
  });
  main.querySelectorAll('[data-data]').forEach((button) => {
    button.addEventListener('click', () => {
      state.dataChoice = button.dataset.data;
      state.dataClueSeen = state.dataChoice !== 'browser';
      saveState();
      render();
      main.querySelector(`[data-data="${state.dataChoice}"]`)?.focus();
    });
  });
  main.querySelector('#evidenceContinue').addEventListener('click', () => goNext());
}

function loadMachineTest(type) {
  if (!MACHINE_TESTS.includes(type)) return;
  state.machineLoaded = type;
  state.machineOutcome = 'idle';
  saveState();
  render();
  main.querySelector('#machineLever')?.focus({ preventScroll: true });
}

function runMachineTest() {
  const type = state.machineLoaded;
  if (!MACHINE_TESTS.includes(type)) return;
  if (type === 'normal') state.normalTestRun = true;
  if (type === 'mischief') state.mischiefTestRun = true;
  state.machineOutcome = type;
  saveState();
  render();
  const c = tr();
  const name = type === 'normal' ? c.normalTest : c.mischiefTest;
  announce(c.machineRunStatus(name));
  main.querySelector('#machineLever')?.focus({ preventScroll: true });
  window.clearTimeout(machineAnimationTimer);
  machineAnimationTimer = window.setTimeout(() => {
    main.querySelector('.machine-flow')?.classList.add('is-settled');
  }, 1500);
}

function canContinueEvidence() {
  return Boolean(state.failure
    && state.normalTestRun
    && state.mischiefTestRun
    && state.privacyCheckRun
    && state.dataChoice === 'browser');
}

function resultTower(type) {
  const c = tr();
  const title = type === 'rule' ? c.doorRule : c.doorAi;
  const outputs = type === 'rule' ? [c.ruleOutput, c.ruleOutput, c.ruleOutput] : c.aiOutputs;
  return `<aside class="result-tower ${type}">
    <header><h2>${escapeHtml(title)}</h2><p>${escapeHtml(type === 'rule' ? c.doorRuleSubtitle : c.doorAiSubtitle)}</p></header>
    <div class="tower-results">
      ${outputs.map((item, index) => `<button type="button" class="door-output-card is-revealed" data-output-detail="${type}-${index + 1}">
        <span class="attempt-label">${escapeHtml(c.attempt(index + 1))}</span><span class="output-text">${escapeHtml(item)}</span>
        <span class="door-output-hint" aria-hidden="true">${escapeHtml(c.tapResult)}</span>
      </button>`).join('')}
    </div>
  </aside>`;
}

function decisionButtons() {
  const c = tr();
  return Object.entries(c.decisions).map(([key, [label, description]]) => `
    <button type="button" class="decision-button" data-decision="${key}" aria-pressed="${state.decision === key}">
      <strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small>${selectedLabel(state.decision === key)}
    </button>
  `).join('');
}

function renderDecide() {
  const c = tr();
  const rationaleLead = state.verdict === 'reject' ? c.rationaleLeadReject : c.rationaleLeadAccept;
  main.innerHTML = `<div class="decide-scene">${stageHeading()}
    <p class="local-notice">${escapeHtml(c.localNotice)}</p>
    <div class="decide-layout">
      ${resultTower('rule')}
      <div class="prediction-bubble">
        <span>${escapeHtml(c.passportFields.prediction)}</span>
        <strong>${escapeHtml(c.predictionOptions[state.prediction])}</strong>
      </div>
      ${resultTower('ai')}
      <section class="decision-card">
        <div class="decision-choice-column">
          <h2>${escapeHtml(c.decisionPrompt)}</h2>
          <div class="decision-grid">${decisionButtons()}</div>
          <h2 class="subsection-title">${escapeHtml(c.verdictTitle)}</h2>
          <div class="verdict-row">
            <button type="button" class="evidence-choice" data-verdict="accept" aria-pressed="${state.verdict === 'accept'}">${escapeHtml(c.accept)}${selectedLabel(state.verdict === 'accept')}</button>
            <button type="button" class="evidence-choice" data-verdict="reject" aria-pressed="${state.verdict === 'reject'}">${escapeHtml(c.reject)}${selectedLabel(state.verdict === 'reject')}</button>
          </div>
        </div>
        <div class="decision-reflection-column">
          <label class="reflection-field">
            <span>${escapeHtml(c.rationaleLabel)}</span>
            <p class="field-label">${escapeHtml(rationaleLead)}</p>
            <textarea id="rationale" maxlength="360" placeholder="${escapeHtml(c.rationalePlaceholder)}">${escapeHtml(state.rationale)}</textarea>
          </label>
          <label class="reflection-field">
            <span>${escapeHtml(c.explainLabel)}</span>
            <textarea id="explainNow" maxlength="300" placeholder="${escapeHtml(c.explainPlaceholder)}">${escapeHtml(state.explainNow)}</textarea>
          </label>
          <div class="cost-fallback">
            <div class="guardrail-note"><strong>${escapeHtml(c.fallbackTitle)}</strong><br>${escapeHtml(c.fallback)}</div>
            <div class="guardrail-note"><strong>${escapeHtml(c.guardrailTitle)}</strong><br>${escapeHtml(c.guardrail)}</div>
          </div>
        </div>
      </section>
      <div class="decision-side">
        <section class="passport-teaser">
          <h2>${escapeHtml(c.passportTitle)}</h2>
          <p>${escapeHtml(c.passportTeaser)}</p>
          <button id="createPassport" class="passport-button" type="button" ${!canCreatePassport() ? 'disabled' : ''}>${escapeHtml(c.createPassport)}</button>
        </section>
      </div>
    </div>
  </div>`;

  main.querySelectorAll('[data-output-detail]').forEach((button) => {
    button.addEventListener('click', () => openResultDetail(button));
  });

  main.querySelectorAll('[data-decision]').forEach((button) => {
    button.addEventListener('click', () => {
      state.decision = button.dataset.decision;
      saveState();
      render();
      main.querySelector(`[data-decision="${state.decision}"]`)?.focus();
    });
  });
  main.querySelectorAll('[data-verdict]').forEach((button) => {
    button.addEventListener('click', () => {
      state.verdict = button.dataset.verdict;
      saveState();
      render();
      main.querySelector(`[data-verdict="${state.verdict}"]`)?.focus();
    });
  });
  const rationale = main.querySelector('#rationale');
  rationale.addEventListener('input', () => {
    state.rationale = rationale.value;
    saveState();
    main.querySelector('#createPassport').disabled = !canCreatePassport();
  });
  const explainNow = main.querySelector('#explainNow');
  explainNow.addEventListener('input', () => {
    state.explainNow = explainNow.value;
    saveState();
    main.querySelector('#createPassport').disabled = !canCreatePassport();
  });
  main.querySelector('#createPassport').addEventListener('click', () => {
    state.passportCreated = true;
    saveState();
    showPassport();
  });
}

function canCreatePassport() {
  return Boolean(state.decision && state.verdict && state.rationale.trim().length >= 3 && state.explainNow.trim().length >= 3);
}

function showPassport() {
  const c = tr();
  const prediction = `${c.predictionOptions[state.prediction]} — ${state.predictionReason.trim()}`;
  const decision = c.decisions[state.decision][0];
  const verdict = state.verdict === 'reject' ? c.reject : c.accept;
  const items = [
    ['prediction', prediction, true],
    ['evidence', c.evidenceSummary, true],
    ['failure', c.failures[state.failure], false],
    ['normal', `${c.normalPrompt} — ${c.normalResult}`, false],
    ['mischief', `${c.mischiefPrompt} — ${c.mischiefResult}`, false],
    ['data', c.dataSummary, true],
    ['guardrail', c.guardrail, false],
    ['outputCheck', c.outputCheck, false],
    ['decision', decision, false],
    ['rationale', `${verdict}: ${state.rationale.trim()}`, true],
    ['fallback', c.fallback, false],
    ['explain', state.explainNow.trim(), false],
  ];

  passportContent.innerHTML = `<article class="passport-sheet">
    <header class="passport-top">
      <div><p class="dialog-kicker">MIMIMO LAB</p><h2 id="passportDialogTitle">${escapeHtml(c.passportTitle)}</h2><p>${escapeHtml(c.passportSubtitle)}</p></div>
      <div class="passport-heading-actions">
        <span class="sample-badge">${escapeHtml(c.localNotice)}</span>
        <button id="closePassportTop" class="secondary-button passport-close-top" type="button">${escapeHtml(c.close)}</button>
      </div>
    </header>
    <div class="passport-grid">
      ${items.map(([key, value, wide]) => `<div class="passport-item ${wide ? 'passport-wide' : ''}"><p class="passport-label">${escapeHtml(c.passportFields[key])}</p><div class="passport-value">${escapeHtml(value)}</div></div>`).join('')}
    </div>
    <div class="passport-actions">
      <button id="printPassport" class="secondary-button" type="button">${escapeHtml(c.print)}</button>
      <button id="closePassport" class="primary-button" type="button">${escapeHtml(c.close)}</button>
    </div>
  </article>`;
  passportContent.querySelector('#printPassport').addEventListener('click', () => window.print());
  passportContent.querySelector('#closePassport').addEventListener('click', () => passportDialog.close());
  passportContent.querySelector('#closePassportTop').addEventListener('click', () => passportDialog.close());
  if (!passportDialog.open) passportDialog.showModal();
  passportDialog.scrollTop = 0;
  requestAnimationFrame(() => { passportDialog.scrollTop = 0; });
  announce(c.passportReady);
}

function goNext() {
  closeResultDetail({ animate: false, restoreFocus: false });
  state.stage = Math.min(3, state.stage + 1);
  state.maxStage = Math.max(state.maxStage, state.stage);
  saveState();
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function render() {
  updateChrome();
  app.dataset.stage = String(state.stage);
  main.dataset.stage = String(state.stage);
  if (state.stage === 0) renderPredict();
  if (state.stage === 1) renderTry();
  if (state.stage === 2) renderEvidence();
  if (state.stage === 3) renderDecide();
  if (activeResultDetail && state.stage > 0) {
    detailReturnTarget = main.querySelector(`[data-output-detail="${activeResultDetail}"]`);
    renderResultDetailContent();
  } else if (resultDetailDialog.open) {
    closeResultDetail({ animate: false, restoreFocus: false });
  }
}

document.querySelectorAll('[data-language]').forEach((button) => {
  button.addEventListener('click', () => {
    const activeElement = document.activeElement;
    state.language = button.dataset.language;
    saveState();
    render();
    document.querySelector(`[data-language="${state.language}"]`)?.focus();
    if (passportDialog.open && activeElement?.closest('#passportDialog')) showPassport();
  });
});

progressNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-stage]');
  if (!button || button.disabled) return;
  closeResultDetail({ animate: false, restoreFocus: false });
  state.stage = Number(button.dataset.stage);
  saveState();
  render();
  main.focus({ preventScroll: true });
});

resetButton.addEventListener('click', () => {
  // A native dialog keeps its previous returnValue. Clear it so reopening and
  // pressing Escape can never repeat an earlier confirmed reset.
  resetDialog.returnValue = '';
  resetDialog.showModal();
});
resetDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  resetDialog.close('cancel');
});
resetDialog.addEventListener('close', () => {
  if (resetDialog.returnValue !== 'confirm') return;
  const language = state.language;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Reset the in-memory Lab even if browser storage is unavailable.
  }
  state = { ...defaultState, language };
  saveState();
  render();
  main.focus({ preventScroll: true });
});

passportDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  passportDialog.close();
});

resultDetailDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeResultDetail();
});

resultDetailDialog.addEventListener('click', (event) => {
  if (event.target === resultDetailDialog) closeResultDetail();
});

render();

export { MACHINE_TESTS, STORAGE_KEY, copy, defaultState };
