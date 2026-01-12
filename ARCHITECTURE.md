# Bandix 项目架构分析

## 项目概述

Bandix 是一个基于 eBPF 技术的网络流量监控工具，使用 Rust 语言开发。它采用模块化架构设计，能够实时监控局域网内设备的网络流量、连接状态和 DNS 查询，并提供 Web API 和命令行界面进行数据访问。

## 主要特性

- **基于 eBPF 技术**：高效监控网络流量，无需修改内核代码
- **模块化架构**：支持独立的流量监控、连接统计和 DNS 监控模块，可按需启用
- **统一设备管理**：集中的设备发现、状态跟踪和信息管理
- **双模式界面**：支持终端和 Web 接口显示
- **实时流量统计**：显示各设备的上传/下载速率和总流量
- **分层数据存储**：实时数据（1秒采样）和长期统计（1小时采样，365天保留）
- **连接统计**：按设备监控 TCP/UDP 连接及状态跟踪
- **MAC-IP关联**：自动关联 IP 地址与 MAC 地址
- **定时速率限制**：为设备设置基于时间的速率限制
- **主机名绑定**：自定义设备主机名映射
- **高性能**：使用 Rust 和 eBPF 确保监控对系统性能影响最小

## 技术原理

### 核心工作原理图

```mermaid
flowchart TB
    subgraph NET["🌐 网络数据流"]
        PKT[网络数据包<br/>Ingress/Egress]
    end

    subgraph KERNEL["⚙️ 内核空间 (eBPF)"]
        direction TB
        TC[TC Hook<br/>数据包拦截点]
        EBPF[eBPF程序<br/>• 流量统计<br/>• DNS捕获<br/>• 速率限制]
        MAPS[eBPF Maps<br/>共享内存<br/>• MAC_TRAFFIC<br/>• DNS_DATA<br/>• RATE_LIMITS]
    end

    subgraph USER["💻 用户空间 (Rust)"]
        direction TB
        READ[数据读取<br/>轮询Maps/RingBuf]
        PROC[数据处理<br/>解析/聚合/计算]
        STORE[数据存储<br/>内存+持久化]
    end

    subgraph UI["👤 用户界面"]
        WEB[Web API<br/>HTTP接口]
        CLI[命令行<br/>实时显示]
    end

    PKT -->|拦截| TC
    TC -->|执行| EBPF
    EBPF -->|统计写入| MAPS
    EBPF -->|限速决策| DECISION{速率检查}
    DECISION -->|通过| FORWARD[数据包转发]
    DECISION -->|超限| DROP[数据包丢弃]
    
    MAPS -->|读取| READ
    READ --> PROC
    PROC --> STORE
    STORE --> WEB
    STORE --> CLI
    
    WEB -->|查询| USER
    CLI -->|显示| USER

    style EBPF fill:#ff6b6b,color:#fff
    style MAPS fill:#4ecdc4,color:#fff
    style STORE fill:#95e1d3,color:#000
    style KERNEL fill:#ffe66d,color:#000
    style USER fill:#a8e6cf,color:#000
```

### 工作原理说明

**数据捕获**：网络数据包被 TC Hook 拦截，eBPF 程序在内核中直接处理数据包，执行统计、过滤、速率限制等操作。

**数据传递**：eBPF Maps 和 RingBuf 作为内核与用户空间的共享内存，实现高效数据传递。

**数据处理**：用户空间程序定期轮询读取统计数据，进行解析、聚合和速率计算。

**数据展示**：通过 Web API 和命令行界面提供实时监控和历史数据查询。

**核心优势**：零拷贝、高性能、低开销、安全可靠的 eBPF 技术实现。

## 项目架构

### 详细架构图

```mermaid
graph TB
    subgraph "用户接口层"
        CLI[命令行界面]
        WEB[Web API 服务<br/>端口 8686<br/>Release模式: 127.0.0.1<br/>Debug模式: 0.0.0.0]
    end

    subgraph "应用层"
        MAIN[主程序<br/>main.rs]
        CMD[命令处理<br/>command.rs]
        MONITOR[监控管理器<br/>MonitorManager]
        DEVICE[设备管理器<br/>DeviceManager]
    end

    subgraph "业务模块层"
        TRAFFIC[流量监控模块<br/>traffic/]
        DNS[DNS监控模块<br/>dns/]
        CONN[连接统计模块<br/>connection/]
    end

    subgraph "数据存储层"
        REALTIME[实时环形存储<br/>RealtimeRingManager<br/>1秒采样]
        LONGTERM[长期统计存储<br/>LongTermRingManager<br/>1小时采样]
    end

    subgraph "eBPF层"
        SHARED[共享eBPF程序<br/>shared_ingress/egress]
        TRAFFIC_EBPF[流量eBPF逻辑<br/>traffic::handle_*]
        DNS_EBPF[DNS eBPF逻辑<br/>dns::handle_*]
    end

    subgraph "内核层"
        TC[Traffic Control<br/>tc ingress/egress]
        MAPS[eBPF Maps<br/>MAC_TRAFFIC, DNS_DATA等]
    end

    CLI --> CMD
    WEB --> CMD
    CMD --> MAIN
    MAIN --> MONITOR
    MONITOR --> DEVICE
    MONITOR --> TRAFFIC
    MONITOR --> DNS
    MONITOR --> CONN

    TRAFFIC --> REALTIME
    TRAFFIC --> LONGTERM
    TRAFFIC --> DEVICE

    TRAFFIC --> SHARED
    DNS --> SHARED
    SHARED --> TC
    TC --> MAPS

    SHARED --> TRAFFIC_EBPF
    SHARED --> DNS_EBPF
```

### 核心组件说明

#### 1. 主程序 (main.rs)
- 程序入口点
- 解析命令行参数
- 初始化异步运行时 (tokio)

#### 2. 命令处理 (command.rs)
- 参数验证和解析
- 模块上下文创建
- 共享资源初始化（主机名绑定、eBPF程序、设备管理器）
- 服务启动和关闭处理

#### 3. 设备管理器 (DeviceManager)
- 统一管理局域网设备发现和状态跟踪
- 维护设备信息（MAC、IP、主机名、在线状态）
- 定期刷新邻居表和设备状态
- 提供设备流量统计和状态查询接口

#### 4. 监控管理器 (MonitorManager)
- 统一管理所有监控模块
- 模块生命周期管理（初始化、启动、停止）
- API 路由注册和模块协调

#### 5. 业务模块
- **流量监控模块**：处理网络流量统计、速率限制、数据存储
- **DNS监控模块**：捕获和分析 DNS 查询/响应
- **连接统计模块**：统计 TCP/UDP 连接状态

### eBPF 数据流图

```mermaid
graph TD
    subgraph "网络数据包流"
        PKT_IN[数据包进入<br/>网络接口] --> TC_INGRESS[TC Ingress Hook]
        PKT_OUT[数据包离开<br/>网络接口] --> TC_EGRESS[TC Egress Hook]
    end

    subgraph "eBPF 程序处理"
        TC_INGRESS --> SHARED_INGRESS[shared_ingress]
        TC_EGRESS --> SHARED_EGRESS[shared_egress]

        SHARED_INGRESS --> CHECK_FLAGS{检查模块启用标志<br/>MODULE_ENABLE_FLAGS}
        SHARED_EGRESS --> CHECK_FLAGS_E{检查模块启用标志<br/>MODULE_ENABLE_FLAGS}

        CHECK_FLAGS --> TRAFFIC_ENABLED{流量模块<br/>启用?}
        CHECK_FLAGS --> DNS_ENABLED{DNS模块<br/>启用?}

        CHECK_FLAGS_E --> TRAFFIC_ENABLED_E{流量模块<br/>启用?}
        CHECK_FLAGS_E --> DNS_ENABLED_E{DNS模块<br/>启用?}
    end

    subgraph "流量处理逻辑"
        TRAFFIC_ENABLED -->|是| TRAFFIC_INGRESS[handle_traffic_ingress]
        TRAFFIC_ENABLED -->|否| PASS_THROUGH[TC_ACT_PIPE]

        TRAFFIC_ENABLED_E -->|是| TRAFFIC_EGRESS[handle_traffic_egress]
        TRAFFIC_ENABLED_E -->|否| PASS_THROUGH_E[TC_ACT_PIPE]

        TRAFFIC_INGRESS --> UPDATE_MAPS[更新eBPF Maps<br/>MAC_TRAFFIC等]
        TRAFFIC_EGRESS --> UPDATE_MAPS_E[更新eBPF Maps<br/>MAC_TRAFFIC等]

        UPDATE_MAPS --> RATE_LIMIT{速率限制<br/>检查}
        UPDATE_MAPS_E --> RATE_LIMIT_E{速率限制<br/>检查}

        RATE_LIMIT -->|超限| DROP_PKT[丢弃数据包<br/>TC_ACT_SHOT]
        RATE_LIMIT -->|正常| PASS_THROUGH

        RATE_LIMIT_E -->|超限| DROP_PKT_E[丢弃数据包<br/>TC_ACT_SHOT]
        RATE_LIMIT_E -->|正常| PASS_THROUGH_E
    end

    subgraph "DNS处理逻辑"
        DNS_ENABLED -->|是| DNS_INGRESS[handle_dns_ingress]
        DNS_ENABLED -->|否| PASS_THROUGH_2[TC_ACT_PIPE]

        DNS_ENABLED_E -->|是| DNS_EGRESS[handle_dns_egress]
        DNS_ENABLED_E -->|否| PASS_THROUGH_E2[TC_ACT_PIPE]

        DNS_INGRESS --> DNS_FILTER{DNS数据包<br/>过滤}
        DNS_EGRESS --> DNS_FILTER_E{DNS数据包<br/>过滤}

        DNS_FILTER -->|是DNS| UPDATE_DNS_MAP[更新DNS_DATA<br/>RingBuf Map]
        DNS_FILTER -->|非DNS| PASS_THROUGH_2

        DNS_FILTER_E -->|是DNS| UPDATE_DNS_MAP_E[更新DNS_DATA<br/>RingBuf Map]
        DNS_FILTER_E -->|非DNS| PASS_THROUGH_E2
    end

    subgraph "用户空间处理"
        UPDATE_DNS_MAP --> RING_BUF[RingBuf读取器]
        UPDATE_DNS_MAP_E --> RING_BUF

        RING_BUF --> DNS_PARSER[DNS数据解析]
        DNS_PARSER --> DNS_STORAGE[DNS查询存储]

        UPDATE_MAPS --> MAP_READER[Map读取器<br/>直接读取HashMap Maps]
        UPDATE_MAPS_E --> MAP_READER

        MAP_READER --> TRAFFIC_PARSER[流量数据解析<br/>从MAC_TRAFFIC Map读取]
        TRAFFIC_PARSER --> TRAFFIC_STORAGE[流量统计存储]
    end

    DROP_PKT --> DROPPED[数据包被丢弃]
    DROP_PKT_E --> DROPPED
    PASS_THROUGH --> FORWARD[数据包正常转发]
    PASS_THROUGH_E --> FORWARD
    PASS_THROUGH_2 --> FORWARD
    PASS_THROUGH_E2 --> FORWARD
```

### 数据流架构图

```mermaid
graph TB
    subgraph "数据源"
        EBPF_MAPS[eBPF Maps<br/>MAC_TRAFFIC, DNS_DATA等]
        CONFIG_FILES[配置文件<br/>hostname_bindings.json<br/>rate_limits.json]
    end

    subgraph "数据处理层"
        MONITOR[监控模块<br/>TrafficMonitor/DnsMonitor<br/>ConnectionMonitor]
        DEVICE_MGR[设备管理器<br/>DeviceManager]
        STORAGE[存储管理器<br/>RealtimeRingManager<br/>LongTermRingManager]
    end

    subgraph "数据存储层"
        MEMORY_CACHE[内存缓存<br/>实时统计数据]
        RING_BUFFER[环形缓冲区<br/>1秒采样数据]
        LONG_TERM[长期统计存储<br/>1小时采样，365天]
        PERSISTENT[持久化存储<br/>磁盘文件]
    end

    subgraph "数据消费层"
        WEB_API[Web API接口<br/>RESTful API]
        CLI_OUTPUT[命令行输出<br/>实时显示]
        METRICS[指标计算<br/>统计分析]
    end

    EBPF_MAPS --> MONITOR
    CONFIG_FILES --> MONITOR

    MONITOR --> DEVICE_MGR
    MONITOR --> STORAGE
    DEVICE_MGR --> STORAGE

    STORAGE --> MEMORY_CACHE
    STORAGE --> RING_BUFFER
    STORAGE --> LONG_TERM

    RING_BUFFER --> PERSISTENT
    LONG_TERM --> PERSISTENT

    MEMORY_CACHE --> WEB_API
    MEMORY_CACHE --> CLI_OUTPUT
    RING_BUFFER --> METRICS
    LONG_TERM --> METRICS

    METRICS --> WEB_API
    METRICS --> CLI_OUTPUT
```

### Web API 架构图

```mermaid
graph TB
    subgraph "API路由层"
        ROUTER[API路由器<br/>ApiRouter]
        TRAFFIC_API[流量API<br/>/api/traffic/*]
        DNS_API[DNS API<br/>/api/dns/*]
        CONN_API[连接API<br/>/api/connection/*]
    end

    subgraph "业务处理器"
        TRAFFIC_HANDLER[TrafficApiHandler<br/>设备流量统计<br/>速率限制管理<br/>主机名绑定]
        DNS_HANDLER[DnsApiHandler<br/>DNS查询记录<br/>统计信息]
        CONN_HANDLER[ConnectionApiHandler<br/>连接统计<br/>TCP/UDP状态]
    end

    subgraph "数据访问层"
        TRAFFIC_REPO[流量数据仓库<br/>RealtimeRingManager<br/>MultiLevelRingManager<br/>内存缓存]
        DNS_REPO[DNS数据仓库<br/>内存查询缓存]
        CONN_REPO[连接数据仓库<br/>内存统计缓存]
    end

    subgraph "外部接口"
        HTTP_CLIENT[HTTP客户端<br/>浏览器/脚本]
        CLI_CLIENT[命令行客户端<br/>curl/wget等]
    end

    HTTP_CLIENT --> ROUTER
    CLI_CLIENT --> ROUTER

    ROUTER --> TRAFFIC_API
    ROUTER --> DNS_API
    ROUTER --> CONN_API

    TRAFFIC_API --> TRAFFIC_HANDLER
    DNS_API --> DNS_HANDLER
    CONN_API --> CONN_HANDLER

    TRAFFIC_HANDLER --> TRAFFIC_REPO
    DNS_HANDLER --> DNS_REPO
    CONN_HANDLER --> CONN_REPO

    subgraph "API端点详情"
        TRAFFIC_ENDPOINTS[流量监控端点<br/>GET /api/traffic/devices<br/>GET /api/traffic/limits/schedule<br/>POST /api/traffic/limits/schedule<br/>GET /api/traffic/metrics<br/>GET /api/traffic/bindings<br/>POST /api/traffic/bindings]
        DNS_ENDPOINTS[DNS监控端点<br/>GET /api/dns/queries<br/>GET /api/dns/stats]
        CONN_ENDPOINTS[连接统计端点<br/>GET /api/connection/devices]
    end

    TRAFFIC_API -.-> TRAFFIC_ENDPOINTS
    DNS_API -.-> DNS_ENDPOINTS
    CONN_API -.-> CONN_ENDPOINTS
```

## 模块详细设计

### 1. 流量监控模块 (traffic/)

#### 架构图
```mermaid
graph TD
    subgraph "eBPF层"
        TRAFFIC_INGRESS[traffic_ingress<br/>入口流量处理]
        TRAFFIC_EGRESS[traffic_egress<br/>出口流量处理]
        TRAFFIC_MAPS[eBPF Maps<br/>MAC_TRAFFIC<br/>RATE_LIMITS<br/>SUBNET_INFO]
    end

    subgraph "用户空间"
        TRAFFIC_MONITOR[TrafficMonitor<br/>监控主循环<br/>每秒轮询]
        TRAFFIC_PARSER[流量数据解析<br/>从eBPF Maps读取<br/>MAC_TRAFFIC等]
        REALTIME_MGR[实时环形管理器<br/>RealtimeRingManager<br/>1秒采样]
        LONGTERM_MGR[长期统计管理器<br/>LongTermRingManager<br/>1小时采样]
        RATE_LIMITER[速率限制器<br/>ScheduledRateLimit]
        DEVICE_MGR[设备管理器<br/>DeviceManager]
    end

    subgraph "数据存储"
        REALTIME_DATA[实时数据<br/>内存环形缓冲]
        LONGTERM_DATA[长期统计数据<br/>文件持久化]
        DEVICE_STATS[设备统计<br/>内存缓存]
    end

    TRAFFIC_INGRESS --> TRAFFIC_MAPS
    TRAFFIC_EGRESS --> TRAFFIC_MAPS
    TRAFFIC_MAPS --> TRAFFIC_PARSER
    TRAFFIC_PARSER --> TRAFFIC_MONITOR
    TRAFFIC_MONITOR --> REALTIME_MGR
    TRAFFIC_MONITOR --> LONGTERM_MGR
    TRAFFIC_MONITOR --> RATE_LIMITER
    TRAFFIC_MONITOR --> DEVICE_MGR

    REALTIME_MGR --> REALTIME_DATA
    LONGTERM_MGR --> LONGTERM_DATA
    DEVICE_MGR --> DEVICE_STATS
```

#### 核心功能
- **实时流量统计**：监控每个设备的上传/下载字节数和速率
- **速率限制**：基于时间调度的流量限制，支持白名单机制
- **分层数据存储**：1秒实时数据 + 1小时长期统计（365天保留）
- **MAC-IP关联**：通过设备管理器自动关联MAC地址和IP地址
- **设备状态跟踪**：监控设备在线/离线状态和最后活动时间

### 2. DNS监控模块 (dns/)

#### 架构图
```mermaid
graph TD
    subgraph "eBPF层"
        DNS_INGRESS[dns_ingress<br/>DNS查询捕获]
        DNS_EGRESS[dns_egress<br/>DNS响应捕获]
        DNS_RINGBUF[RingBuf Map<br/>DNS_DATA]
    end

    subgraph "用户空间"
        DNS_MONITOR[DnsMonitor<br/>DNS监控主循环<br/>每10ms轮询RingBuf]
        DNS_PARSER[DNS数据解析<br/>RingBuf读取]
        DNS_STORAGE[DNS记录存储<br/>内存缓存<br/>最多保留dns_max_records条]
        DNS_ANALYZER[DNS分析器<br/>统计计算]
    end

    subgraph "数据处理"
        QUERY_RECORD[查询记录<br/>DnsQueryRecord]
        STATS_CALC[统计计算<br/>响应时间<br/>成功率<br/>查询类型分布]
        FILTER_SEARCH[过滤搜索<br/>域名/设备/时间]
    end

    DNS_INGRESS --> DNS_RINGBUF
    DNS_EGRESS --> DNS_RINGBUF
    DNS_RINGBUF --> DNS_PARSER
    DNS_PARSER --> DNS_MONITOR
    DNS_MONITOR --> DNS_STORAGE
    DNS_STORAGE --> DNS_ANALYZER
    DNS_ANALYZER --> STATS_CALC
    DNS_STORAGE --> FILTER_SEARCH
```

#### 核心功能
- **DNS查询捕获**：捕获所有DNS查询和响应
- **响应时间分析**：计算DNS查询响应时间
- **统计分析**：查询成功率、查询类型分布、最活跃设备等
- **记录过滤**：支持按域名、设备、时间等条件过滤

### 3. 连接统计模块 (connection/)


#### 核心功能
- **TCP连接状态跟踪**：通过读取 `/proc/net/nf_conntrack` 文件统计不同状态的TCP连接数
- **UDP连接统计**：统计UDP连接数量
- **设备关联**：结合ARP表将连接统计与MAC/IP地址关联
- **全局统计**：提供网络范围的连接统计信息（每3秒更新一次）


## 部署架构

```mermaid
graph TB
    subgraph "OpenWrt路由器"
        BANDIX[Bandix进程<br/>监控服务]
        WEB_IFACE[网络接口<br/>br-lan]
        STORAGE[数据存储<br/>/tmp/bandix-data]
    end

    subgraph "局域网设备"
        DEVICE1[设备1<br/>192.168.1.100]
        DEVICE2[设备2<br/>192.168.1.101]
        DEVICEN[设备N<br/>...]
    end

    subgraph "管理终端"
        BROWSER[Web浏览器<br/>访问8686端口]
        CLI[命令行终端<br/>ssh连接]
        API_CLIENT[API客户端<br/>脚本/工具]
    end

    WEB_IFACE --> BANDIX
    BANDIX --> STORAGE

    DEVICE1 --> WEB_IFACE
    DEVICE2 --> WEB_IFACE
    DEVICEN --> WEB_IFACE

    BROWSER --> BANDIX
    CLI --> BANDIX
    API_CLIENT --> BANDIX

    subgraph "监控范围"
        TRAFFIC_MON[流量监控<br/>所有IP包]
        DNS_MON[DNS监控<br/>53端口流量]
        CONN_MON[连接统计<br/>TCP/UDP连接]
    end

    BANDIX -.-> TRAFFIC_MON
    BANDIX -.-> DNS_MON
    BANDIX -.-> CONN_MON
```

