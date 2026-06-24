use crate::error::{JsonError, JsonResult};
use serde::{Deserialize, Serialize};

/// Mock data generation options
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MockOptions {
    /// Number of array items to generate (for root array or array fields)
    #[serde(default = "default_array_size")]
    pub array_size: usize,
    /// Maximum nesting depth for objects
    #[serde(default = "default_max_depth")]
    pub max_depth: usize,
    /// Seed for reproducible generation (None = random)
    pub seed: Option<u64>,
}

fn default_array_size() -> usize {
    5
}

fn default_max_depth() -> usize {
    3
}

impl Default for MockOptions {
    fn default() -> Self {
        Self {
            array_size: 5,
            max_depth: 3,
            seed: None,
        }
    }
}

/// Generate mock JSON data based on a template/schema.
///
/// The template can be:
/// - A JSON object with type hints as values (e.g., {"name": "@string", "age": "@number"})
/// - A JSON Schema (detected by "$schema" or "type" field)
/// - A plain JSON object (values are used as type hints)
/// - An empty object (generates a random user-like object)
pub fn generate_mock(template: &str, opts: &MockOptions) -> JsonResult<String> {
    let template_value: serde_json::Value = if template.trim().is_empty() {
        // Default template: generate a user-like object
        serde_json::json!({
            "id": "@uuid",
            "name": "@name",
            "email": "@email",
            "age": "@number",
            "active": "@boolean",
            "tags": "@array",
            "address": {
                "city": "@city",
                "country": "@country"
            },
            "createdAt": "@date"
        })
    } else {
        serde_json::from_str(template)?
    };

    let mut rng = SeededRng::new(opts.seed);
    let result = generate_value(&template_value, opts, &mut rng, 0);
    let pretty = serde_json::to_string_pretty(&result)?;
    Ok(pretty)
}

fn generate_value(
    template: &serde_json::Value,
    opts: &MockOptions,
    rng: &mut SeededRng,
    depth: usize,
) -> serde_json::Value {
    match template {
        serde_json::Value::String(s) => generate_from_hint(s, opts, rng, depth),
        serde_json::Value::Object(map) => {
            if depth >= opts.max_depth {
                return serde_json::Value::Object(
                    map.iter()
                        .map(|(k, _)| (k.clone(), serde_json::Value::Null))
                        .collect(),
                );
            }
            let mut result = serde_json::Map::new();
            for (key, val) in map {
                result.insert(key.clone(), generate_value(val, opts, rng, depth + 1));
            }
            serde_json::Value::Object(result)
        }
        serde_json::Value::Array(arr) => {
            if arr.is_empty() {
                // Empty array template: generate random strings
                let items: Vec<serde_json::Value> = (0..opts.array_size)
                    .map(|_| serde_json::Value::String(random_word(rng)))
                    .collect();
                serde_json::Value::Array(items)
            } else {
                // Use first element as template for all items
                let template_item = &arr[0];
                let items: Vec<serde_json::Value> = (0..opts.array_size)
                    .map(|_| generate_value(template_item, opts, rng, depth))
                    .collect();
                serde_json::Value::Array(items)
            }
        }
        _ => template.clone(),
    }
}

fn generate_from_hint(hint: &str, opts: &MockOptions, rng: &mut SeededRng, depth: usize) -> serde_json::Value {
    let hint = hint.trim();

    // Check for @ prefix type hints
    if hint.starts_with('@') {
        let hint_type = &hint[1..];
        return match hint_type {
            "string" | "str" | "text" => serde_json::Value::String(random_word(rng)),
            "name" | "fullname" => serde_json::Value::String(random_name(rng)),
            "firstName" | "firstname" => serde_json::Value::String(random_first_name(rng)),
            "lastName" | "lastname" => serde_json::Value::String(random_last_name(rng)),
            "email" => serde_json::Value::String(random_email(rng)),
            "phone" | "tel" => serde_json::Value::String(random_phone(rng)),
            "number" | "num" | "int" | "integer" => {
                serde_json::Value::Number(serde_json::Number::from(rng.next_i64(1, 9999)))
            }
            "float" | "double" | "price" | "amount" => {
                let n = rng.next_f64(1.0, 9999.99);
                serde_json::Number::from_f64(n)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null)
            }
            "boolean" | "bool" => serde_json::Value::Bool(rng.next_bool()),
            "date" | "datetime" => serde_json::Value::String(random_date(rng)),
            "uuid" | "guid" => serde_json::Value::String(random_uuid(rng)),
            "url" | "link" | "href" => serde_json::Value::String(random_url(rng)),
            "ip" | "ipv4" => serde_json::Value::String(random_ip(rng)),
            "color" | "hex" => serde_json::Value::String(random_color(rng)),
            "city" => serde_json::Value::String(random_city(rng)),
            "country" => serde_json::Value::String(random_country(rng)),
            "address" => serde_json::Value::String(random_address(rng)),
            "company" | "companyName" => serde_json::Value::String(random_company(rng)),
            "job" | "jobTitle" => serde_json::Value::String(random_job(rng)),
            "lorem" | "paragraph" | "sentence" => serde_json::Value::String(random_lorem(rng)),
            "image" | "avatar" => serde_json::Value::String(format!("https://picsum.photos/seed/{}/200/200", rng.next_u32(1, 9999))),
            "array" => {
                if depth >= opts.max_depth {
                    serde_json::Value::Array(vec![])
                } else {
                    let items: Vec<serde_json::Value> = (0..opts.array_size)
                        .map(|_| serde_json::Value::String(random_word(rng)))
                        .collect();
                    serde_json::Value::Array(items)
                }
            }
            _ => serde_json::Value::String(hint.to_string()),
        };
    }

    // Range hint: @number(1,100) or @string(5,10)
    if hint.starts_with("@number(") {
        let range: Vec<&str> = hint[8..hint.len()-1].split(',').collect();
        if range.len() == 2 {
            let min = range[0].trim().parse::<i64>().unwrap_or(1);
            let max = range[1].trim().parse::<i64>().unwrap_or(100);
            return serde_json::Value::Number(serde_json::Number::from(rng.next_i64(min, max)));
        }
    }

    // If not a hint, return as-is (literal value)
    // Try to parse as JSON value first
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(hint) {
        return v;
    }
    serde_json::Value::String(hint.to_string())
}

// ===== Random generators =====

struct SeededRng {
    state: u64,
}

impl SeededRng {
    fn new(seed: Option<u64>) -> Self {
        let state = seed.unwrap_or_else(|| {
            // Use system time as seed
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos() as u64)
                .unwrap_or(42)
        });
        Self { state: state.max(1) }
    }

    fn next_u64(&mut self) -> u64 {
        // xorshift64 - ensure state is never 0
        if self.state == 0 {
            self.state = 0xDEADBEEFCAFEBABE;
        }
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    fn next_u32(&mut self, min: u32, max: u32) -> u32 {
        if min >= max {
            return min;
        }
        let range = (max - min) as u64 + 1;
        ((self.next_u64() % range) as u32) + min
    }

    fn next_i64(&mut self, min: i64, max: i64) -> i64 {
        if min >= max {
            return min;
        }
        let range = (max - min) as u64 + 1;
        (self.next_u64() % range) as i64 + min
    }

    fn next_f64(&mut self, min: f64, max: f64) -> f64 {
        let r = (self.next_u64() as f64) / (u64::MAX as f64);
        min + r * (max - min)
    }

    fn next_bool(&mut self) -> bool {
        self.next_u64() % 2 == 0
    }

    fn pick<'a, T>(&mut self, items: &'a [T]) -> &'a T {
        let idx = (self.next_u64() as usize) % items.len();
        &items[idx]
    }
}

fn random_word(rng: &mut SeededRng) -> String {
    let words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
        "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma",
        "tau", "upsilon", "phi", "chi", "psi", "omega"];
    rng.pick(&words).to_string()
}

fn random_first_name(rng: &mut SeededRng) -> String {
    let names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
        "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan",
        "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "张伟", "王芳",
        "李明", "赵静", "刘强", "陈丽", "杨洋", "黄敏", "周杰", "吴秀"];
    rng.pick(&names).to_string()
}

fn random_last_name(rng: &mut SeededRng) -> String {
    let names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
        "Davis", "Rodriguez", "Martinez", "王", "李", "张", "刘", "陈", "杨", "黄",
        "周", "吴", "徐"];
    rng.pick(&names).to_string()
}

fn random_name(rng: &mut SeededRng) -> String {
    format!("{} {}", random_first_name(rng), random_last_name(rng))
}

fn random_email(rng: &mut SeededRng) -> String {
    let domains = ["gmail.com", "yahoo.com", "outlook.com", "example.com", "qq.com", "163.com"];
    format!("user{}@{}", rng.next_u32(100, 9999), rng.pick(&domains))
}

fn random_phone(rng: &mut SeededRng) -> String {
    format!("1{}{:08}", rng.next_u32(3, 9), rng.next_u32(0, 99999999))
}

fn random_date(rng: &mut SeededRng) -> String {
    let year = rng.next_u32(2000, 2025);
    let month = rng.next_u32(1, 12);
    let day = rng.next_u32(1, 28);
    let hour = rng.next_u32(0, 23);
    let min = rng.next_u32(0, 59);
    let sec = rng.next_u32(0, 59);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, hour, min, sec)
}

fn random_uuid(rng: &mut SeededRng) -> String {
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        rng.next_u32(0, 0xFFFFFFFF),
        rng.next_u32(0, 0xFFFF),
        rng.next_u32(0, 0xFFFF),
        rng.next_u32(0, 0xFFFF),
        rng.next_u64() & 0xFFFFFFFFFFFF
    )
}

fn random_url(rng: &mut SeededRng) -> String {
    let tlds = ["com", "org", "net", "io", "dev", "cn"];
    format!("https://example{}.{}", rng.next_u32(1, 999), rng.pick(&tlds))
}

fn random_ip(rng: &mut SeededRng) -> String {
    format!("{}.{}.{}.{}",
        rng.next_u32(1, 255),
        rng.next_u32(0, 255),
        rng.next_u32(0, 255),
        rng.next_u32(1, 255))
}

fn random_color(rng: &mut SeededRng) -> String {
    format!("#{:06x}", rng.next_u32(0, 0xFFFFFF))
}

fn random_city(rng: &mut SeededRng) -> String {
    let cities = ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "New York", "London",
        "Tokyo", "Paris", "Berlin", "Sydney", "北京", "上海", "广州", "深圳", "杭州"];
    rng.pick(&cities).to_string()
}

fn random_country(rng: &mut SeededRng) -> String {
    let countries = ["China", "USA", "UK", "Japan", "Germany", "France", "Australia",
        "Canada", "Korea", "India"];
    rng.pick(&countries).to_string()
}

fn random_address(rng: &mut SeededRng) -> String {
    format!("{} {} St", rng.next_u32(1, 9999), random_word(rng))
}

fn random_company(rng: &mut SeededRng) -> String {
    let prefixes = ["Tech", "Data", "Cloud", "Cyber", "Smart", "Meta", "Quantum", "Digital"];
    let suffixes = ["Corp", "Inc", "Labs", "Systems", "Solutions", "Group", "AI", "Hub"];
    format!("{} {}", rng.pick(&prefixes), rng.pick(&suffixes))
}

fn random_job(rng: &mut SeededRng) -> String {
    let jobs = ["Engineer", "Designer", "Manager", "Analyst", "Developer", "Architect",
        "Consultant", "Director", "Specialist", "Coordinator"];
    rng.pick(&jobs).to_string()
}

fn random_lorem(rng: &mut SeededRng) -> String {
    let words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
        "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et"];
    let count = rng.next_u32(5, 15) as usize;
    (0..count)
        .map(|_| rng.pick(&words).to_string())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_mock() {
        let opts = MockOptions {
            seed: Some(42),
            ..Default::default()
        };
        let result = generate_mock("", &opts).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert!(parsed.is_object());
        assert!(parsed.get("id").is_some());
        assert!(parsed.get("name").is_some());
        assert!(parsed.get("email").is_some());
    }

    #[test]
    fn test_template_mock() {
        let template = r#"{"name":"@name","age":"@number","active":"@boolean"}"#;
        let opts = MockOptions {
            seed: Some(42),
            array_size: 3,
            max_depth: 2,
        };
        let result = generate_mock(template, &opts).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["name"].as_str().unwrap().split(' ').count(), 2);
        assert!(parsed["age"].as_i64().is_some());
        assert!(parsed["active"].as_bool().is_some());
    }

    #[test]
    fn test_array_mock() {
        let template = r#"[{"id":"@uuid","name":"@name"}]"#;
        let opts = MockOptions {
            seed: Some(42),
            array_size: 5,
            max_depth: 3,
        };
        let result = generate_mock(template, &opts).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.as_array().unwrap().len(), 5);
        assert!(parsed[0].get("id").is_some());
        assert!(parsed[0].get("name").is_some());
    }

    #[test]
    fn test_reproducible() {
        let opts = MockOptions {
            seed: Some(123),
            ..Default::default()
        };
        let result1 = generate_mock("", &opts).unwrap();
        let result2 = generate_mock("", &opts).unwrap();
        assert_eq!(result1, result2);
    }

    #[test]
    fn test_type_hints() {
        let template = r#"{
            "email": "@email",
            "phone": "@phone",
            "date": "@date",
            "uuid": "@uuid",
            "url": "@url",
            "ip": "@ip",
            "color": "@color",
            "city": "@city",
            "country": "@country",
            "company": "@company",
            "lorem": "@lorem"
        }"#;
        let opts = MockOptions { seed: Some(42), ..Default::default() };
        let result = generate_mock(template, &opts).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert!(parsed["email"].as_str().unwrap().contains('@'));
        assert!(parsed["uuid"].as_str().unwrap().contains('-'));
        assert!(parsed["url"].as_str().unwrap().starts_with("https://"));
        assert!(parsed["ip"].as_str().unwrap().contains('.'));
        assert!(parsed["color"].as_str().unwrap().starts_with('#'));
    }
}
