import { IElectronAPI, IMainAPI } from "@common/types"

declare global {
    interface Window {
        electron: IElectronAPI;
        api: IMainAPI;
    }
}