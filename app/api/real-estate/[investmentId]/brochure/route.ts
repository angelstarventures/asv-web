import { Readable } from "node:stream";
import { listPublicRealEstateInvestments } from "@/lib/dataconnect/client";
import { streamDriveFile } from "@/lib/serverDrive";
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: {
    params: Promise<{
        investmentId: string;
    }>;
}) {
    const { investmentId } = await params;
    // Re-read publication status on every origin request; the public connector selects no money.
    const { realEstateInvestments } = await listPublicRealEstateInvestments();
    const p = realEstateInvestments.find(p => p.id.replaceAll('-', '') === investmentId.replaceAll('-', ''));
    if (!p?.brochureDriveFileId)
        return new Response('Not found', { status: 404 });
    const { stream, mimeType } = await streamDriveFile(p.brochureDriveFileId);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
        stream.destroy();
        return new Response('Not found', { status: 404 });
    }
    return new Response(Readable.toWeb(stream) as ReadableStream, { headers: { 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
}
