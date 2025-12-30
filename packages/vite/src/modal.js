
module.exports = (attrs = {} ,options = {}) => {
    return `
    (async function () {
        const _o = ${JSON.stringify(options)};
        // 获取版本文件
        const versionUrl = "${options.versionDir}${options.filename}"
        const res = await fetch(versionUrl + "?_=" + Date.now());
        const data = await res.json();
        // 根容器
        const wrapper = document.createElement('div');

        wrapper.className = '__vite-xc-web-update-notice ${attrs.placement || 'rt'}';
        wrapper.id = '__vite-xc-web-update-notice'

        // 标题
        const title = document.createElement('span');
        title.className = '__vite-xc-web-update-notice_title';
        title.textContent = '${attrs.modalTitle || '系统提示'}';

        // 内容
        const content = document.createElement('p');
        content.className = '__vite-xc-web-update-notice_content';
        content.textContent = '${attrs.modalContent || '发现新版本，是否立即更新'}';

        // footer
        const footer = document.createElement('div');
        footer.className = '__vite-xc-web-update-notice_footer';

        // 按钮：稍后更新
        const laterBtn = document.createElement('button');
        laterBtn.className = '__vite-xc-web-update-notice_footer_later_update';
        laterBtn.textContent = '${attrs.laterText || '稍后更新'}';
        laterBtn.onclick = () => {
            const mdoalEle = document.getElementById("__vite-xc-web-update-notice");
            if(${['rb', 'rt'].includes(attrs.placement)}) {
                mdoalEle.style.right = '-340px'
            }

            if(${['lt', 'lb'].includes(attrs.placement)}) {
                mdoalEle.style.left = '-340px'
            }
            window._xcUpdate.updateLater();
        };

        // 按钮：立即更新
        const updateBtn = document.createElement('button');
        updateBtn.className = '__vite-xc-web-update-notice_footer_update';
        updateBtn.textContent = '${attrs.okText || '立即更新'}';
        updateBtn.onclick = () => {
            const laterInfoVersionList = window._xcUpdate._laterInfo()
            localStorage.setItem(_o.customVersionName,laterInfoVersionList[laterInfoVersionList.length-1]?.version || data.hash);
            window.location.reload();
        };

        // 组装 footer
        footer.append(laterBtn, updateBtn);

        // 组装整体结构
        wrapper.append(title, content, footer);

        document.body.appendChild(wrapper)
    })()
`
}
