import {createHash} from "crypto"
import {VERSION_MODE} from "../constants";
/**
 * @description 创建环境hash
 * @param {string} mode hash生成模式
 * @param {string} version 如果模式为custom则使用version
 */
export function createEnvironmentHash(mode, version) {
    if(mode === VERSION_MODE.HASH) {
        const hash = createHash('md5');
        hash.update(Date.now().toString());
        const result = hash.digest('hex');
        return result
    }else if (mode === VERSION_MODE.CUSTOM) {
        return version
    }else {
        return '1.0.0'
    }
}
