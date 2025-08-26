import { PhotoInfo } from "../shared/types";

/** Instance of a selected photo, with the name (manifest key) and photo data (manifest value). */
export type SelectedPhoto = {
    name: string;
    photo: PhotoInfo;
}
