import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.css';

export default function About() {
  const handleCopy = () => {
    Taro.setClipboardData({ data: 'https://github.com/junhey/json-toolkit' });
  };

  return (
    <View className="about-container">
      <View className="about-logo">
        <Text className="about-emoji">⚡</Text>
      </View>
      <Text className="about-title">JSON Toolkit</Text>
      <Text className="about-version">v0.1.0</Text>
      <Text className="about-desc">
        强大的 JSON 工具箱，支持格式化、压缩、排序、JSONPath 查询、Base64 解码、CSV 转换等功能。
      </Text>

      <View className="about-section">
        <Text className="section-title">功能列表</Text>
        <View className="feature-list">
          <Text className="feature-item">✓ JSON 格式化 / 压缩</Text>
          <Text className="feature-item">✓ 按键名 / 值排序</Text>
          <Text className="feature-item">✓ Base64 / URL / Unicode 解码</Text>
          <Text className="feature-item">✓ JSONPath 路径查询</Text>
          <Text className="feature-item">✓ JSON 语法校验</Text>
          <Text className="feature-item">✓ JSON → CSV 转换</Text>
        </View>
      </View>

      <View className="about-section">
        <Text className="section-title">技术栈</Text>
        <Text className="tech-text">
          Rust + WASM 核心 · Taro 跨端框架 · React
        </Text>
      </View>

      <View className="about-section">
        <Text className="section-title">开源地址</Text>
        <Text className="link-text" onClick={handleCopy}>
          github.com/junhey/json-toolkit
        </Text>
        <Text className="copy-hint">点击复制链接</Text>
      </View>
    </View>
  );
}
