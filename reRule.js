function main(config, profileName) {
    // 1. 默认回退组
    let targetGroup = 'DIRECT';

    // 2. 代理组关键词数组（可随时扩展）
    const groupKeywords = ['美国', 'united states', 'us', 'america'];

    // 3. 控制开关（true = 启用，false = 禁用）
    const ENABLE_RULES = {
        cursor: true,
        gemini: true,
        claude: true,
        augmentcode: true,
        trae: true
    };

    // 4. 分类好的规则
    const RULES = {
        cursor: {
            'DOMAIN': [
                'api2.cursor.sh',
                'api3.cursor.sh',
                'repo42.cursor.sh',
                'api4.cursor.sh',
                'us-only.gcpp.cursor.sh',
                'marketplace.cursorapi.com',
                'cursor-cdn.com',
                'download.todesktop.com'
            ],
            'DOMAIN-KEYWORD': ['cursor'],
            'DOMAIN-SUFFIX': ['cursor.sh', 'cursorapi.com', 'workos.com']
        },
        gemini: {
            'DOMAIN': [
                'ai.google.dev',
                'alkalimakersuite-pa.clients6.google.com',
                'makersuite.google.com'
            ],
            'DOMAIN-SUFFIX': [
                'bard.google.com',
                'deepmind.com',
                'deepmind.google',
                'gemini.google.com',
                'generativeai.google',
                'proactivebackend-pa.googleapis.com',
                'apis.google.com'
            ],
            'DOMAIN-KEYWORD': [
                'colab',
                'developerprofiles',
                'generativelanguage'
            ]
        },
        claude: {
            'DOMAIN': ['cdn.usefathom.com'],
            'DOMAIN-SUFFIX': ['anthropic.com', 'claude.ai', 'claudeusercontent.com']
        },
        augmentcode: {
            'DOMAIN-KEYWORD': ['augmentcode'],
            'DOMAIN-SUFFIX': ['augmentcode.com']
        },
        trae: {
            'DOMAIN-SUFFIX': [
                'trae.ai',
                'byteoversea.com',
                'trae-api-sg.mchost.guru',
                'lf3-static.bytednsdoc.com',
                'bytegate-sg.byteintlapi.com',
                'abtestvm-sg.bytedance.com',
                'tron-sg.bytelemon.com',
                'sf16-short-sg.bytedapm.com',
                'trae.com.cn',
                'tron.jiyunhudong.com',
                'starling.zijieapi.com'
            ]
        }
    };

    // 5. 搜索符合条件的代理组
    const proxyGroups = config['proxy-groups'] || [];
    if (proxyGroups.length > 0) {
        const matchedGroups = proxyGroups.filter(group =>
            group.name &&
            groupKeywords.some(kw =>
                new RegExp(kw, 'i').test(group.name)
            )
        );

        // 优先使用找到的匹配组，否则使用第一个组
        targetGroup = matchedGroups.length > 0
            ? matchedGroups[0].name
            : proxyGroups[0].name;
    }

    // 6. 生成规则并去重
    const prependRules = new Set();

    for (const [service, enabled] of Object.entries(ENABLE_RULES)) {
        if (!enabled) continue; // 跳过关闭的服务
        const ruleSet = RULES[service];
        for (const [ruleType, domains] of Object.entries(ruleSet)) {
            domains.forEach(domain => {
                prependRules.add(`${ruleType},${domain},${targetGroup}`);
            });
        }
    }

    // 7. 插入到开头，保证去重
    config.rules = config.rules || [];
    const finalRules = [...prependRules, ...config.rules];
    config.rules = Array.from(new Set(finalRules));

    return config;
}
