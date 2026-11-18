globalThis.SensoryConfig = {
  schemaVersion: 1,
  study: {
    name: '海港区',
    dataLicense: '',
    publicMap: {
      src: './data/qinhuangdao-standard-2025.jpg', width: 2480, height: 3070,
      label: '秦皇岛市标准地图（水系交通版）',
      alt: '秦皇岛市标准地图。海港区位于图中偏右、秦皇岛市标记东北侧，临近渤海。',
      attribution: '天地图·河北 · 审图号：冀S（2025）011号',
      source: 'https://hebei.tianditu.gov.cn/bzdt/',
      streetView: 'https://www.amap.com/ssr/embed/view?lng=119.583&lat=39.943&zoom=13&platform=pc&src=sensory-harbor'
    }
  },
  demoMap: { src: './data/harbor-sketch.svg', attribution: '自绘示意图 · 非地理底图', label: '版式演示 · 非真实位置' },
  types: { path: '通行路径', daily: '日常必需', public: '公共空间', venue: '大型场馆' },
  dimensions: [
    { id: 'noise', name: '背景噪声', icon: 'volume', prompt: '正常音量交谈能听清吗？有没有持续的设备声或车流声？', criteria: null },
    { id: 'sudden', name: '突发声', icon: 'pulse', prompt: '记录叫号、鸣笛和摔门等事件，以及能不能提前预料。', criteria: null },
    { id: 'light', name: '光与视觉', icon: 'sun', prompt: '留意直射、眩光、闪动的灯或屏幕，以及视觉杂乱。', criteria: null },
    { id: 'crowd', name: '人流拥挤', icon: 'people', prompt: '看行走有无受阻、排队多久、能否与他人保持距离。', criteria: null },
    { id: 'retreat', name: '安静空间', icon: 'leaf', prompt: '找可以坐下缓一缓的地方，记路线、步行时间和使用条件。', criteria: null },
    { id: 'smell', name: '气味', icon: 'wind', prompt: '留意消毒水、油烟等气味，记来源和是否持续。', criteria: null }
  ],
  scenarios: {
    indoor: { label: '城市室内', notes: '留意灯具、镜面反光、叫号和排队动线。' },
    outdoor: { label: '城市室外', notes: '留意人车混行、鸣笛、沿街广播和退出路线。' },
    nature: { label: '自然户外', notes: '留意水面反光、地面材质、遮阴与可休息位置。' }
  },
  sources: ['叫号或场馆广播', '广场舞音箱', '机动车或电动车鸣笛', '叫卖', '报站', '装修或施工', '摔门', '其他'],
  policy: { state: 'draft', version: 'draft-01', recommendedMin: null, rejectMax: null, maxMissing: null, required: [] },
  demoPoints: [
    { id: 'DEMO-01', name: '候诊等候区', type: 'daily', status: 'verified', position: [37, 42], location: '东门至一层等候区', period: '工作日 · 午间', finding: '入口一带人流较少，候诊区有间歇叫号。', advice: '可从东门入内；想休息可退出到门外长椅。', scores: { noise: 4, sudden: 3, light: 4, crowd: 4, retreat: 4, smell: 5 } },
    { id: 'DEMO-02', name: '街心公园步道', type: 'public', status: 'verified', position: [23, 69], location: '南门至林荫步道', period: '工作日 · 上午', finding: '林荫段有座椅，靠广场一端听得到音箱。', advice: '需要安静时走林荫侧，不穿过中心广场。', scores: { noise: 4, sudden: 4, light: 5, crowd: 4, retreat: 4, smell: 5 } },
    { id: 'DEMO-03', name: '公交换乘路段', type: 'path', status: 'candidate', position: [18, 31], location: '站台至人行横道', finding: '候选示例，等待现场核验。' },
    { id: 'DEMO-04', name: '剧场入口', type: 'venue', status: 'candidate', position: [59, 29], location: '主入口至检票区', finding: '候选示例，等待现场核验。' }
  ]
};
