import { useState, useCallback } from 'react';
import { View, Text, Textarea, ScrollView, Navigator } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { tools, runTool, type ToolId } from '@/utils/jsonTools';
import './index.css';

const sampleJson = `{
  "name": "JSON Toolkit",
  "version": "0.1.0",
  "features": ["format", "minify", "sort", "query"],
  "author": {
    "name": "junhey",
    "url": "https://github.com/junhey"
  }
}`;

export default function Index() {
  const [activeTool, setActiveTool] = useState<ToolId>('format');
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [path, setPath] = useState('$.name');
  const [encoding, setEncoding] = useState('base64');
  const [copied, setCopied] = useState(false);

  const handleRun = useCallback(() => {
    if (!input.trim()) {
      setError('请输入 JSON 内容');
      return;
    }
    setError('');
    setOutput('');
    try {
      const options: any = {};
      if (activeTool === 'jsonpath') options.path = path;
      if (activeTool === 'decode') options.encoding = encoding;
      const result = runTool(activeTool, input, options);
      setOutput(result);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }, [input, activeTool, path, encoding]);

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

  const needsPath = activeTool === 'jsonpath';
  const needsEncoding = activeTool === 'decode';

  return (
    <View className="container">
      {/* Tool selection grid */}
      <View className="tool-grid">
        {tools.map((tool) => (
          <View
            key={tool.id}
            className={`tool-card ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
          >
            <Text className="tool-icon">{tool.icon}</Text>
            <Text className="tool-name">{tool.name}</Text>
          </View>
        ))}
      </View>

      {/* Options */}
      {(needsPath || needsEncoding) && (
        <View className="card">
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
              <Text className="label">编码方式</Text>
              <View className="encoding-row">
                {['base64', 'url', 'unicode'].map((enc) => (
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

      {/* Input */}
      <View className="card">
        <View className="card-header">
          <Text className="card-title">输入</Text>
          <View className="card-actions">
            <Text className="action-btn" onClick={handleSample}>示例</Text>
            <Text className="action-btn" onClick={handleClear}>清空</Text>
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

      {/* Action button */}
      <View className="btn-primary" onClick={handleRun}>
        <Text>▶ 执行</Text>
      </View>

      {/* Error */}
      {error && (
        <View className="error-box">
          <Text>{error}</Text>
        </View>
      )}

      {/* Output */}
      {output && (
        <View className="card">
          <View className="card-header">
            <Text className="card-title">结果</Text>
            <Text className="action-btn" onClick={handleCopy}>
              {copied ? '✓ 已复制' : '复制'}
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
