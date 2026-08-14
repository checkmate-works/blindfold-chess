import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetOptionalUser, mockCanUseMaia, mockLoadMaiaModel } = vi.hoisted(() => ({
  mockGetOptionalUser: vi.fn(),
  mockCanUseMaia: vi.fn(),
  mockLoadMaiaModel: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getOptionalUser: mockGetOptionalUser,
}));

vi.mock('@/lib/users/can-use-maia', () => ({
  canUseMaia: mockCanUseMaia,
}));

vi.mock('./_lib/load-maia-model', () => ({
  loadMaiaModel: mockLoadMaiaModel,
}));

const { GET } = await import('./route');

function buildRequest() {
  return new Request('http://localhost/api/engines/maia/maia3_simplified.onnx');
}

function buildParams(file: string) {
  return { params: Promise.resolve({ file }) };
}

describe('GET /api/engines/maia/[file]', () => {
  beforeEach(() => {
    mockGetOptionalUser.mockReset();
    mockCanUseMaia.mockReset();
    mockLoadMaiaModel.mockReset();
  });

  it('returns 404 for filenames outside the allow-list', async () => {
    const res = await GET(buildRequest(), buildParams('../secret.txt'));
    expect(res.status).toBe(404);
    expect(mockGetOptionalUser).not.toHaveBeenCalled();
    expect(mockLoadMaiaModel).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown model files (no probing for arbitrary paths)', async () => {
    const res = await GET(buildRequest(), buildParams('maia3_simplified.onnx.bak'));
    expect(res.status).toBe(404);
    expect(mockCanUseMaia).not.toHaveBeenCalled();
  });

  it('returns 403 for anonymous callers', async () => {
    mockGetOptionalUser.mockResolvedValue(null);
    mockCanUseMaia.mockResolvedValue(false);

    const res = await GET(buildRequest(), buildParams('maia3_simplified.onnx'));

    expect(res.status).toBe(403);
    expect(mockCanUseMaia).toHaveBeenCalledWith(null);
    expect(mockLoadMaiaModel).not.toHaveBeenCalled();
  });

  it('returns 403 for authenticated users without an active subscription / grant', async () => {
    mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
    mockCanUseMaia.mockResolvedValue(false);

    const res = await GET(buildRequest(), buildParams('maia3_simplified.onnx'));

    expect(res.status).toBe(403);
    expect(mockCanUseMaia).toHaveBeenCalledWith('user-1');
    expect(mockLoadMaiaModel).not.toHaveBeenCalled();
  });

  it('returns the model bytes for entitled callers with the expected headers', async () => {
    const fakeModel = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
    mockCanUseMaia.mockResolvedValue(true);
    mockLoadMaiaModel.mockResolvedValue(fakeModel);

    const res = await GET(buildRequest(), buildParams('maia3_simplified.onnx'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Length')).toBe(String(fakeModel.length));
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=31536000, immutable');

    const body = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(body)).toEqual([0x01, 0x02, 0x03, 0x04]);
  });

  it('returns 404 when the loader cannot find the file on disk', async () => {
    mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
    mockCanUseMaia.mockResolvedValue(true);
    mockLoadMaiaModel.mockResolvedValue(null);

    const res = await GET(buildRequest(), buildParams('maia3_simplified.onnx'));

    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not Found');
  });
});
