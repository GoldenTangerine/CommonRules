/**
 * Clash 规则自动生成器
 * @author sm
 * @description 根据配置自动生成直连和代理规则,支持多种格式的URL、域名和关键词匹配
 */
function main(config, profileName) {
    // 1. 默认回退组
    let targetGroup = 'DIRECT';

    // 2. 代理组关键词数组（可随时扩展）
    const groupKeywords = ['美国', 'united states', 'us', 'america'];

    // 3. 直连网址数组（这些网址不走代理，直接连接）
    // 支持三种格式:
    //   1. 完整URL:    'https://example.com'  → 生成 DOMAIN 规则
    //   2. 纯域名:     'example.com'          → 生成 DOMAIN 规则
    //   3. 关键词匹配: {type: 'keyword', value: 'example'} → 生成 DOMAIN-KEYWORD 规则
    const DIRECT_URLS = [
        'https://hk1.pincc.ai',           // 完整 URL 格式
        'minimaxi.com',                   // 纯域名格式
        {type: 'keyword', value: 'minimaxi'}, // 关键词匹配格式 (匹配所有包含 linux 的域名)
        //'https://linux.do/',
        //'https://yxn.hk',  // 建议保留尾随逗号,便于后续添加
    ];

    // 4. 自定义代理组配置（支持为不同代理组配置不同规则）
    // 每个代理组支持两种规则类型:
    //   - {type: 'keyword', value: 'google'} → 生成 DOMAIN-KEYWORD 规则
    //   - {type: 'suffix', value: 'youtube.com'} → 生成 DOMAIN-SUFFIX 规则
    const PROXY_GROUPS = [
        {
            name: 'us',
            groupKeywords: ['美国', 'united states', 'us', 'america'],
            rules: [
                {type: 'keyword', value: 'spotify'},
                {type: 'suffix', value: 'spotify.com'}
            ]
        }
    ];

    // 5. 控制开关（true = 启用，false = 禁用）
    const ENABLE_RULES = {
        directUrls: true,  // 直连网址开关
        cursor: true,
        gemini: true,
        claude: true,
        augmentcode: true,
        trae: true,
        // 代理组开关（根据 PROXY_GROUPS 中的 name 字段添加）
        proxyGroup_us: true,
    };

    // 5. 分类好的规则
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

    // 6. 搜索符合条件的代理组
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

    // 7. 生成规则并去重
    const prependRules = new Set();

    // 7.1 优先处理直连规则（确保最高优先级）
    if (ENABLE_RULES.directUrls && DIRECT_URLS && DIRECT_URLS.length > 0) {
        DIRECT_URLS.forEach(item => {
            // 处理对象格式: {type: 'keyword', value: 'example'}
            if (typeof item === 'object' && item !== null) {
                const itemType = item.type || 'domain';  // 默认按域名处理
                const itemValue = item.value;

                // 跳过无效值
                if (!itemValue || typeof itemValue !== 'string' || itemValue.trim() === '') {
                    return;
                }

                const trimmedValue = itemValue.trim().toLowerCase();

                // 根据类型生成对应规则
                if (itemType === 'keyword') {
                    // 关键词匹配规则 (不需要包含点号)
                    prependRules.add(`DOMAIN-KEYWORD,${trimmedValue},DIRECT`);
                } else {
                    // 域名规则 (需要包含点号)
                    if (trimmedValue.includes('.')) {
                        prependRules.add(`DOMAIN,${trimmedValue},DIRECT`);
                    }
                }
                return;
            }

            // 处理字符串格式: 'https://example.com' 或 'example.com'
            if (typeof item === 'string' && item.trim() !== '') {
                const trimmedUrl = item.trim();
                let domain = trimmedUrl;

                try {
                    // 尝试解析为 URL (支持 https://example.com 格式)
                    const urlObj = new URL(trimmedUrl);
                    domain = urlObj.hostname;
                } catch (e) {
                    // 解析失败,当作纯域名处理 (支持 example.com 格式)
                    // 移除可能的协议前缀和路径
                    domain = trimmedUrl
                        .replace(/^(https?:\/\/)?(www\.)?/, '')  // 移除协议和 www
                        .replace(/\/.*$/, '')  // 移除路径部分
                        .toLowerCase();  // 转小写
                }

                // 验证域名有效性 (简单检查)
                if (domain && domain.includes('.')) {
                    prependRules.add(`DOMAIN,${domain},DIRECT`);
                }
            }
        });
    }

    // 7.2 处理自定义代理组规则
    if (PROXY_GROUPS && PROXY_GROUPS.length > 0) {
        PROXY_GROUPS.forEach(proxyGroup => {
            const groupName = proxyGroup.name;
            const switchKey = `proxyGroup_${groupName}`;

            // 检查开关是否启用
            if (!ENABLE_RULES[switchKey]) return;

            // 查找匹配的代理组
            const matchedGroups = proxyGroups.filter(group =>
                group.name &&
                proxyGroup.groupKeywords.some(kw =>
                    new RegExp(kw, 'i').test(group.name)
                )
            );

            // 如果没有匹配的代理组，跳过
            if (matchedGroups.length === 0) return;

            const matchedGroupName = matchedGroups[0].name;

            // 处理规则
            if (proxyGroup.rules && proxyGroup.rules.length > 0) {
                proxyGroup.rules.forEach(rule => {
                    if (!rule.value || typeof rule.value !== 'string' || rule.value.trim() === '') {
                        return;
                    }

                    const ruleValue = rule.value.trim().toLowerCase();

                    if (rule.type === 'keyword') {
                        prependRules.add(`DOMAIN-KEYWORD,${ruleValue},${matchedGroupName}`);
                    } else if (rule.type === 'suffix') {
                        prependRules.add(`DOMAIN-SUFFIX,${ruleValue},${matchedGroupName}`);
                    }
                });
            }
        });
    }

    // 7.3 处理代理规则
    for (const [service, enabled] of Object.entries(ENABLE_RULES)) {
        if (!enabled || service === 'directUrls' || service.startsWith('proxyGroup_')) continue; // 跳过关闭的服务、directUrls 和代理组开关
        const ruleSet = RULES[service];
        if (!ruleSet) continue; // 跳过不存在的规则集
        for (const [ruleType, domains] of Object.entries(ruleSet)) {
            domains.forEach(domain => {
                prependRules.add(`${ruleType},${domain},${targetGroup}`);
            });
        }
    }

    // 8. 插入到开头，保证去重
    config.rules = config.rules || [];
    const finalRules = [...prependRules, ...config.rules];
    config.rules = Array.from(new Set(finalRules));

    return config;
}
