'use client';

import { useCallback } from 'react';

export function useEncodeDecode() {
    const decodeString = useCallback((msg: bigint): string => {
        let str = "";
        let temp = msg;
        while (temp > 0n) {
            const charCode = Number(temp & 0xFFn);
            str = String.fromCharCode(charCode) + str;
            temp = temp >> 8n;
        }
        return str;
    }, []);

    const encodeString = useCallback((msg: string): bigint => {
        let encoded = BigInt(0);
        for (let i = 0; i < msg.length; i++) {
            encoded = (encoded << 8n) + BigInt(msg.charCodeAt(i));
        }
        return encoded;
    }, []);

    return { decodeString, encodeString };
}
