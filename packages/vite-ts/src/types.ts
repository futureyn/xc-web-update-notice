export interface CustomModalAttrs {
  placement?: 'rt' | 'rb' | 'lt' | 'lb';
  modalTitle?: string;
  modalContent?: string;
  laterText?: string;
  okText?: string;
}

export interface PluginOptions {
  isLogout?: boolean;
  versionDir?: string;
  checkerDir?: string;
  interval?: number;
  publishDescription?: string;
  laterInterval?: number;
  filename?: string;
  checkerName?: string;
  customModalAttrs?: CustomModalAttrs;
  historyFile?: string;
  keepVersions?: number;
  versionMode?: 'hash' | 'custom';
  version?: string;
  isProd?: boolean;
  useDefaultModal?: boolean;
  customModalCssName?: string;
  customModalHTMLName?: string;
  customVersionName?: string;
  outDir?: string;
}

export interface UpdateInfo {
  oldHash: string;
  newHash: string;
  isLogout: boolean;
  publishDescription?: string;
}

export interface XcUpdateAPI {
  onUpdate(callback: (info: UpdateInfo) => void, version?: string): void;
  updateLater(): void;
  setModalLocal(options: { title?: string; content?: string }): void;
  _laterInfo(): Array<{ version: string; isLater: boolean; isLogout: boolean }>;
}
