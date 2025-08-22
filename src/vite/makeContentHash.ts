import { BinaryLike, createHash } from "crypto";

export function makeContentHash(content: BinaryLike, length?: number): string {
    return createHash('sha256')
        .update(content)
        .digest('hex')
        .slice(0, length)
        ;
}
