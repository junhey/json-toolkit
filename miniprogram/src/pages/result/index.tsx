import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import './index.css';

export default function Result() {
  const router = useRouter();
  const [output, setOutput] = useState('');

  useEffect(() => {
    const data = router.params.output || '';
    setOutput(decodeURIComponent(data));
  }, [router.params]);

  const handleCopy = () => {
    Taro.setClipboardData({ data: output });
  };

  return (
    <View className="result-container">
      <View className="result-header">
        <Text className="result-title">处理结果</Text>
        <Button size="mini" onClick={handleCopy}>复制</Button>
      </View>
      <ScrollView scrollY className="result-scroll">
        <Text className="result-text">{output}</Text>
      </ScrollView>
    </View>
  );
}
