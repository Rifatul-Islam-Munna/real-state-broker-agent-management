import { emailSignatureContent, normalizeEmailSignature, sanitizeEmailSignatureHtml } from './email-signature';

describe('Email signatures', () => {
  it('keeps Gmail formatting, links, table layout, and public logo images', () => {
    const html = '<table cellpadding="0"><tr><td><b style="color:#123456;font-size:14px">Agent</b><br><i>Licensed Agent</i><br><a href="mailto:agent@example.com">agent@example.com</a><img src="https://example.com/logo.png" width="250" height="80"></td></tr></table>';
    const result = normalizeEmailSignature({ emailSignatureEnabled: true, emailSignatureHtml: html });
    expect(result.emailSignatureHtml).toContain('<b style="color:#123456;font-size:14px">Agent</b>');
    expect(result.emailSignatureHtml).toContain('<i>Licensed Agent</i>');
    expect(result.emailSignatureHtml).toContain('src="https://example.com/logo.png"');
    expect(result.emailSignatureHtml).toContain('cellpadding="0"');
    expect(result.emailSignatureText).toContain('Agent');
    expect(result.emailSignatureText).toContain('agent@example.com');
  });

  it('removes scripts, handlers, unsafe URLs, SVG, and CSS URLs', () => {
    const result = sanitizeEmailSignatureHtml('<script>alert(1)</script><svg onload="alert(1)"></svg><b onclick=alert(1)>Agent</b><a href="javascript:alert(1)">Link</a><img src="data:image/svg+xml;base64,PHN2Zz4=" onerror=alert(1)><img src="file:///secret"><span style="color:red;background-image:url(https://evil.example);position:fixed">Safe</span>');
    expect(result).toContain('<b>Agent</b>');
    expect(result).toContain('<span style="color:red">Safe</span>');
    expect(result).not.toMatch(/script|svg|onclick|onerror|javascript|file:|background-image|position|evil\.example/);
  });

  it('preserves custom text spacing and safely escapes literal markup', () => {
    const text = 'Agent & Team\n\n  Licensed <Agent>  ';
    const signature = emailSignatureContent({ emailSignatureEnabled: true, emailSignatureText: text });
    expect(signature.text).toBe(text);
    expect(signature.html).toContain('Agent &amp; Team<br><br>  Licensed &lt;Agent&gt;  ');
  });

  it('does not append a disabled signature', () => {
    expect(emailSignatureContent({ emailSignatureEnabled: false, emailSignatureText: 'Agent' }))
      .toEqual({ html: '', text: '' });
  });

  it('rejects oversized content and unsupported image sources', () => {
    expect(() => normalizeEmailSignature({ emailSignatureText: 'x'.repeat(10_001) })).toThrow('10000');
    expect(() => normalizeEmailSignature({ emailSignatureHtml: 'x'.repeat(100_001) })).toThrow('too long');
    expect(() => normalizeEmailSignature({ emailSignatureImageUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).toThrow('signature image');
    expect(() => normalizeEmailSignature({ emailSignatureImageUrl: 'file:///secret.png' })).toThrow('signature image');
    expect(() => normalizeEmailSignature({ emailSignatureImageUrl: `data:image/png;base64,${Buffer.alloc(201 * 1024).toString('base64')}` })).toThrow('200 KB');
  });
});
