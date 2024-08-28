import React, { useState } from 'react';
import axios from 'axios';
import { Table, Button, Input, Select, Checkbox, message } from 'antd';
import * as XLSX from 'xlsx';
import './style.css';

const { Option } = Select;

const getStatusColor = (statusCode) => {
  if (statusCode >= 500) return 'red'; 
  if (statusCode >= 400) return 'orange'; 
  if (statusCode >= 300) return 'blue'; 
  return 'green'; 
};

const fetchData = async (url, dataType, onlyUhf, setData, setColumns, setAllDetails, setLoading) => {
  setLoading(true);
  try {
    const response = await axios.post(`https://backend-webfetcher.vercel.app/api/${dataType}`, {
      url,
      onlyUhf,
    });
    const responseData = response.data;

    if (dataType === 'all-details') {
      setAllDetails(responseData);
    } else {
      const dataMapping = {
        'extract-urls': { columns: [{ title: 'URL', dataIndex: 'url', key: 'url' }], data: responseData.urls },
        'link-details': { 
          columns: [
            { title: 'Link Type', dataIndex: 'linkType', key: 'linkType' },
            { title: 'Link Text', dataIndex: 'linkText', key: 'linkText', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
            { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
            { title: 'URL', dataIndex: 'url', key: 'url' },
            { title: 'Redirected URL', dataIndex: 'redirectedUrl', key: 'redirectedUrl' },
            { title: 'Status Code', dataIndex: 'statusCode', key: 'statusCode', render: (text, record) => <span style={{ color: getStatusColor(record.statusCode) }}>{text}</span> },
            { title: 'Target', dataIndex: 'target', key: 'target' },
          ],
          data: responseData.links,
        },
        'image-details': { 
          columns: [
            { title: 'Image Name', dataIndex: 'imageName', key: 'imageName' },
            { title: 'Alt Text', dataIndex: 'alt', key: 'alt', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
          ],
          data: responseData.images,
        },
        'video-details': { 
          columns: [
            { title: 'Transcript', dataIndex: 'transcript', key: 'transcript' },
            { title: 'CC', dataIndex: 'cc', key: 'cc' },
            { title: 'Autoplay', dataIndex: 'autoplay', key: 'autoplay' },
            { title: 'Muted', dataIndex: 'muted', key: 'muted' },
            { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
            { title: 'Audio Track Present', dataIndex: 'audioTrack', key: 'audioTrack' },
          ],
          data: responseData.videoDetails.map(video => ({
            ...video,
            transcript: video.transcript.join(', '),
            cc: video.cc.join(', '),
          })),
        },
        'page-properties': { 
          columns: [
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Content', dataIndex: 'content', key: 'content' },
          ],
          data: responseData.metaTags,
        },
        'heading-hierarchy': { 
          columns: [
            { title: 'Level', dataIndex: 'level', key: 'level' },
            { title: 'Text', dataIndex: 'text', key: 'text' },
          ],
          data: responseData.headingHierarchy,
        }
      };

      if (dataMapping[dataType]) {
        setColumns(dataMapping[dataType].columns);
        setData(dataMapping[dataType].data.map((item, index) => ({ key: index, ...item })));
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    message.error('Failed to fetch data.');
  } finally {
    setLoading(false);
  }
};

const handleDownloadExcel = (allDetails) => {
  const sheetData = {
    'Link Details': allDetails.links || [],
    'Image Details': allDetails.images || [],
    'Video Details': allDetails.videoDetails?.map(video => ({
      ...video,
      transcript: video.transcript.join(', '),
      cc: video.cc.join(', '),
    })) || [],
    'Page Properties': allDetails.metaTags || [],
    'Heading Details': allDetails.headingHierarchy || [],
  };

  const workbook = XLSX.utils.book_new();
  Object.keys(sheetData).forEach(sheetName => {
    const worksheet = XLSX.utils.json_to_sheet(sheetData[sheetName]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  XLSX.writeFile(workbook, 'data.xlsx');
};

const App = () => {
  const [url, setUrl] = useState('');
  const [dataType, setDataType] = useState('all-details');
  const [onlyUhf, setOnlyUhf] = useState(true);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [allDetails, setAllDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="container">
      <div className="header">
        <h1>Web Page Fetcher</h1>
      </div>
      <Input
        placeholder="Enter URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <Select
        value={dataType}
        onChange={(value) => {
          setDataType(value);
          setData([]); 
          if (value !== 'all-details') setAllDetails(null);
        }}
        style={{ width: 200, marginBottom: 10 }}
      >
        <Option value="extract-urls">Extract URLs</Option>
        <Option value="link-details">Link Details</Option>
        <Option value="image-details">Image Details</Option>
        <Option value="video-details">Video Details</Option>
        <Option value="page-properties">Page Properties</Option>
        <Option value="heading-hierarchy">Heading Hierarchy</Option>
        <Option value="all-details">All Details</Option>
      </Select>
      <Checkbox
        checked={onlyUhf}
        onChange={(e) => setOnlyUhf(e.target.checked)}
        style={{ marginBottom: 10 }}
      >
        Only UHF
      </Checkbox>
      <Button
        onClick={() => fetchData(url, dataType, onlyUhf, setData, setColumns, setAllDetails, setLoading)}
        type="primary"
        style={{ marginBottom: 10 }}
        loading={loading}
      >
        Fetch Data
      </Button>
      <Button
        onClick={() => handleDownloadExcel(allDetails)}
        type="default"
        disabled={!allDetails}
      >
        Download as Excel
      </Button>

      {(dataType === 'all-details' || dataType === 'page-properties') && (
        <>
          {dataType === 'all-details' && allDetails && (
            <>
              <h2>Link Details</h2>
              <Table
                dataSource={Array.isArray(allDetails.links) ? allDetails.links.map((link, index) => ({ key: index, ...link })) : []}
                columns={columns}
              />
              <h2>Image Details</h2>
              <Table
                dataSource={Array.isArray(allDetails.images) ? allDetails.images.map((image, index) => ({ key: index, ...image })) : []}
                columns={columns}
              />
              <h2>Video Details</h2>
              <Table
                dataSource={Array.isArray(allDetails.videoDetails) ? allDetails.videoDetails.map((video, index) => ({
                  key: index,
                  transcript: video.transcript.join(', '),
                  cc: video.cc.join(', '),
                  autoplay: video.autoplay,
                  muted: video.muted,
                  ariaLabel: video.ariaLabel,
                  audioTrack: video.audioTrack,
                })) : []}
                columns={columns}
              />
              <h2>Page Properties</h2>
              <Table
                dataSource={Array.isArray(allDetails.metaTags) ? allDetails.metaTags.map((meta, index) => ({ key: index, ...meta })) : []}
                columns={columns}
              />
              <h2>Heading Hierarchy</h2>
              <Table
                dataSource={Array.isArray(allDetails.headingHierarchy) ? allDetails.headingHierarchy.map((heading, index) => ({
                  key: index,
                  level: heading.level,
                  text: heading.text,
                })) : []}
                columns={columns}
              />
            </>
          )}
          {dataType === 'page-properties' && (
            <Table
              dataSource={Array.isArray(data) ? data : []}
              columns={columns}
              pagination={{ pageSize: 10 }}
            />
          )}
        </>
      )}
      {dataType === 'page-properties' && (
  <Table
    dataSource={Array.isArray(data) ? data : []}
    columns={columns}
    pagination={{ pageSize: 10 }}
  />
)}
      {dataType !== 'all-details' && dataType !== 'page-properties' && (
        <Table
          dataSource={data}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      )}
    </div>
  );
};

export default App;
