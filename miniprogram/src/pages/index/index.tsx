import { useState, useCallback } from 'react';
import { View, Text, Textarea, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { tools, runTool, type ToolId } from '@/utils/jsonTools';
import './index.css';

const sampleJson = `{
  "name": "JSON Toolkit",
  "version": "0.2.0",
  "features": ["format", "minify", "codec", "query"]
}`;

const ENCODE_OPTS = [
  'unicode',
  'url',
  'utf16',
  'base64',
  'hex',
  'html',
  'html_deep',
  'html_to_js',
  'escape',
];

const DECODE_OPTS = [
  'unicode',
  'url',
  'utf16',
  'base64',
  'hex_ascii',
  'html_entity',
  'url_params',
  'jwt',
  'cookie',
  'escape',
];

export default function Index() {
  const [activeTool, setActiveTool] = useState<ToolId>('format');
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [path, setPath] = useState('$.name');
  const [encoding, setEncoding] = useState('unicode');
  const [pasteAuto, setPasteAuto] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleRun = useCallback(
    (override?: string) => {
      const text = override ?? input;
      if (!text.trim()) {
        setError('请输入内容');
        return;
      }
      setError('');
      setOutput('');
      try {
        const options: any = {};
        if (activeTool === 'jsonpath') options.path = path;
        if (activeTool === 'encode' || activeTool === 'decode') options.encoding = encoding;
        const result = runTool(activeTool, text, options);
        setOutput(result);
      } catch (e: any) {
        setError(e.message || String(e));
      }
    },
    [input, activeTool, path, encoding]
  );

  const handleCopy = useCallback(() => {
    if (!output) return;
    Taro.setClipboardData({ data: output });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError('');
  }, []);

  const handleSample = useCallback(() => {
    setInput(sampleJson);
    setOutput('');
    setError('');
  }, []);

  const handlePasteAuto = useCallback(async () => {
    try {
      const res = await Taro.getClipboardData();
      const text = res.data || '';
      if (!text.trim()) {
        Taro.showToast({ title: '剪贴板为空', icon: 'none' });
        return;
      }
      setInput(text);
      if (pasteAuto && activeTool === 'format') {
        handleRun(text);
      }
    } catch {
      Taro.showToast({ title: '读取剪贴板失败', icon: 'none' });
    }
  }, [pasteAuto, activeTool, handleRun]);

  const needsPath = activeTool === 'jsonpath';
  const needsEncoding = activeTool === 'encode' || activeTool === 'decode';
  const encodingOpts = activeTool === 'encode' ? ENCODE_OPTS : DECODE_OPTS;

  return (
    <View className="container">
      <View className="hero">
        <Text className="hero-title">JSON Toolkit</Text>
        <Text className="hero-sub">v0.2 · 多端 JSON 工具箱</Text>
      </View>

      <View className="tool-grid">
        {tools.map((tool) => (
          <View
            key={tool.id}
            className={`tool-card ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTool(tool.id);
              if (tool.id === 'encode') setEncoding('unicode');
              if (tool.id === 'decode') setEncoding('unicode');
            }}
          >
            <Text className="tool-icon">{tool.icon}</Text>
            <Text className="tool-name">{tool.name}</Text>
          </View>
        ))}
      </View>

      {(needsPath || needsEncoding || activeTool === 'format') && (
        <View className="card">
          {activeTool === 'format' && (
            <View className="switch-row" onClick={() => setPasteAuto((v) => !v)}>
              <Text className="label">粘贴后自动美化</Text>
              <View className={`switch ${pasteAuto ? 'on' : ''}`}>
                <View className="switch-knob" />
              </View>
            </View>
          )}
          {needsPath && (
            <View>
              <Text className="label">JSONPath 表达式</Text>
              <Textarea
                value={path}
                onInput={(e) => setPath(e.detail.value)}
                placeholder="$.store.book[*].title"
                className="input-small"
              />
            </View>
          )}
          {needsEncoding && (
            <View>
              <Text className="label">
                {activeTool === 'encode' ? '加密 / 编码方式' : '解密 / 解码方式'}
              </Text>
              <View className="encoding-row">
                {encodingOpts.map((enc) => (
                  <View
                    key={enc}
                    className={`encoding-btn ${encoding === enc ? 'active' : ''}`}
                    onClick={() => setEncoding(enc)}
                  >
                    <Text>{enc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View className="card">
        <View className="card-header">
          <Text className="card-title">输入</Text>
          <View className="card-actions">
            <Text className="action-btn" onClick={handlePasteAuto}>
              粘贴
            </Text>
            <Text className="action-btn" onClick={handleSample}>
              示例
            </Text>
            <Text className="action-btn" onClick={handleClear}>
              清空
            </Text>
          </View>
        </View>
        <Textarea
          value={input}
          onInput={(e) => setInput(e.detail.value)}
          placeholder='{"key": "value"}'
          className="textarea"
          maxlength={-1}
        />
      </View>

      <View className="btn-primary" onClick={() => handleRun()}>
        <Text>执行</Text>
      </View>

      {error && (
        <View className="error-box">
          <Text>{error}</Text>
        </View>
      )}

      {output && (
        <View className="card result-card">
          <View className="card-header">
            <Text className="card-title">解析结果</Text>
            <Text className="action-btn" onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </Text>
          </View>
          <ScrollView scrollY className="output-scroll">
            <Text className="output-text">{output}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
