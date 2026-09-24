export interface UserData {
    username: string;
    password: string;
}

interface xForm {
    formID: string;
    name: string;
    descriptionText: string;
    downloadUrl: string;
    manifestUrl?: string;
}

export interface Form {
    uid: string;
    name: string;
    description: string;
    xml_url: string;
    manifest_url?: string;
}

interface MediaFile {
    filename: string;
    hash: string;
    downloadUrl: string;
}

export interface ManifestObj {
    manifest: { mediaFile: MediaFile[] };
}

export interface FormListObj {
    xforms: { xform: xForm[] };
}

export interface CloudFormData {
    uuid: string;
    form_id: string;
    xml: string;
    created_at?: string;
}

export interface ToastMessageType {
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
    action?: boolean;
    duration?: number;
    options?: object;
}

export interface SyncCategoryProgress {
    completed: number;
    total: number;
    currentItem: string;
}

export interface SyncProgressState {
    active: boolean;
    /** Name of the category (table) most recently touched - which one to show on a single-line
     * "which table, how many records" indicator, since several sync concurrently. */
    current: string;
    categories: Record<string, SyncCategoryProgress>;
}
