import React, { useState, useEffect } from 'react';
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

const App = () => {
  const [url, setUrl] = useState('');
  const [dataType, setDataType] = useState('all-details');
  const [onlyUhf, setOnlyUhf] = useState(true);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [allDetails, setAllDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'https://webpage-fetcher-backend.vercel.app/api';

  useEffect(() => {
    console.log('Current data:', data);
    console.log('Current allDetails:', allDetails);
  }, [data, allDetails]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/${dataType}`, {
        url,
        onlyUhf,
      });
      const responseData = response.data;
      console.log('API Response:', responseData);

      if (dataType === 'extract-urls') {
        setColumns([{ title: 'URL', dataIndex: 'url', key: 'url' }]);
        setData(responseData.urls?.map((url, index) => ({ key: index, url })) || []);
      } else if (dataType === 'link-details') {
        setColumns([
          { title: 'Link Type', dataIndex: 'linkType', key: 'linkType' },
          { title: 'Link Text', dataIndex: 'linkText', key: 'linkText', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
          { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
          { title: 'URL', dataIndex: 'url', key: 'url' },
          { title: 'Redirected URL', dataIndex: 'redirectedUrl', key: 'redirectedUrl' },
          { 
            title: 'Status Code', 
            dataIndex: 'statusCode', 
            key: 'statusCode', 
            render: (text, record) => <span style={{ color: getStatusColor(record.statusCode) }}>{text}</span> 
          },
          { title: 'Target', dataIndex: 'target', key: 'target' },
        ]);
        setData(Array.isArray(responseData.links) ? responseData.links.map((link, index) => ({ key: index, ...link })) : []);
      } else if (dataType === 'image-details') {
        setColumns([
          { title: 'Image Name', dataIndex: 'imageName', key: 'imageName' },
          { title: 'Alt Text', dataIndex: 'alt', key: 'alt', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
        ]);
        setData(responseData.images?.filter(image => image.imageName).map((image, index) => ({ key: index, ...image })) || []);
      } else if (dataType === 'video-details') {
        setColumns([
          { title: 'Transcript', dataIndex: 'transcript', key: 'transcript' },
          { title: 'CC', dataIndex: 'cc', key: 'cc' },
          { title: 'Autoplay', dataIndex: 'autoplay', key: 'autoplay' },
          { title: 'Muted', dataIndex: 'muted', key: 'muted' },
          { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
          { title: 'Audio Track Present', dataIndex: 'audioTrack', key: 'audioTrack' },
        ]);
        setData(responseData.videoDetails?.map((video, index) => ({
          key: index,
          transcript: video.transcript.join(', '),
          cc: video.cc.join(', '),
          autoplay: video.autoplay,
          muted: video.muted,
          ariaLabel: video.ariaLabel,
          audioTrack: video.audioTrack,
        })) || []);
      } else if (dataType === 'page-properties' || dataType === 'all-details') {
        setColumns([
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Content', dataIndex: 'content', key: 'content' },
        ]);
        const metaTagsData = Array.isArray(responseData.metaTags) 
          ? responseData.metaTags.map((meta, index) => ({ 
              key: index, 
              name: meta.name || meta.property || 'Unknown',
              content: meta.content || 'N/A'
            }))
          : [];
        console.log('Processed metaTagsData:', metaTagsData);
        if (dataType === 'page-properties') {
          setData(metaTagsData);
        } else {
          setAllDetails({
            links: responseData.links || [],
            images: responseData.images || [],
            videoDetails: responseData.videoDetails || [],
            metaTags: metaTagsData,
            headingHierarchy: responseData.headingHierarchy || [],
          });
        }
      } else if (dataType === 'heading-hierarchy') {
        setColumns([
          { title: 'Level', dataIndex: 'level', key: 'level' },
          { title: 'Text', dataIndex: 'text', key: 'text' },
        ]);
        setData(responseData.headingHierarchy?.map((heading, index) => ({
          key: index,
          level: heading.level,
          text: heading.text,
        })) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    const sheetData = {
      'Link Details': Array.isArray(allDetails?.links) ? allDetails.links : [],
      'Image Details': Array.isArray(allDetails?.images) ? allDetails.images : [],
      'Video Details': Array.isArray(allDetails?.videoDetails) ? allDetails.videoDetails.map(video => ({
        ...video,
        transcript: video.transcript.join(', '),
        cc: video.cc.join(', '),
      })) : [],
      'Page Properties': Array.isArray(allDetails?.metaTags) ? allDetails.metaTags : [],
      'Heading Details': Array.isArray(allDetails?.headingHierarchy) ? allDetails.headingHierarchy : [],
    };

    const workbook = XLSX.utils.book_new();
    Object.keys(sheetData).forEach(sheetName => {
      const worksheet = XLSX.utils.json_to_sheet(sheetData[sheetName]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    XLSX.writeFile(workbook, 'data.xlsx');
  };

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
        onClick={fetchData}
        type="primary"
        style={{ marginBottom: 10 }}
        loading={loading}
      >
        Fetch Data
      </Button>
      <Button
        onClick={handleDownloadExcel}
        type="default"
      >
        Download as Excel
      </Button>

      {(dataType === 'all-details' || dataType === 'page-properties') && (
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: 'max-content' }}
          style={{ marginTop: 20 }}
        />
      )}

      {dataType === 'all-details' && allDetails && (
        <>
          <Table
            columns={[
              { title: 'Link Type', dataIndex: 'linkType', key: 'linkType' },
              { title: 'Link Text', dataIndex: 'linkText', key: 'linkText', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
              { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
              { title: 'URL', dataIndex: 'url', key: 'url' },
              { title: 'Redirected URL', dataIndex: 'redirectedUrl', key: 'redirectedUrl' },
              { title: 'Status Code', dataIndex: 'statusCode', key: 'statusCode', render: (text, record) => <span style={{ color: getStatusColor(record.statusCode) }}>{text}</span> },
              { title: 'Target', dataIndex: 'target', key: 'target' },
            ]}
            dataSource={allDetails.links}
            pagination={false}
            scroll={{ x: 'max-content' }}
            style={{ marginTop: 20 }}
          />

          <Table
            columns={[
              { title: 'Image Name', dataIndex: 'imageName', key: 'imageName' },
              { title: 'Alt Text', dataIndex: 'alt', key: 'alt', render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} /> },
            ]}
            dataSource={allDetails.images}
            pagination={false}
            scroll={{ x: 'max-content' }}
            style={{ marginTop: 20 }}
          />

          <Table
            columns={[
              { title: 'Transcript', dataIndex: 'transcript', key: 'transcript' },
              { title: 'CC', dataIndex: 'cc', key: 'cc' },
              { title: 'Autoplay', dataIndex: 'autoplay', key: 'autoplay' },
              { title: 'Muted', dataIndex: 'muted', key: 'muted' },
              { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
              { title: 'Audio Track Present', dataIndex: 'audioTrack', key: 'audioTrack' },
            ]}
            dataSource={allDetails.videoDetails.map((video, index) => ({
              key: index,
              transcript: video.transcript.join(', '),
              cc: video.cc.join(', '),
              autoplay: video.autoplay,
              muted: video.muted,
              ariaLabel: video.ariaLabel,
              audioTrack: video.audioTrack,
            }))}
            pagination={false}
            scroll={{ x: 'max-content' }}
            style={{ marginTop: 20 }}
          />

          <Table
            columns={[
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Content', dataIndex: 'content', key: 'content' },
            ]}
            dataSource={allDetails.metaTags}
            pagination={false}
            scroll={{ x: 'max-content' }}
            style={{ marginTop: 20 }}
          />

          <Table
            columns={[
              { title: 'Level', dataIndex: 'level', key: 'level' },
              { title: 'Text', dataIndex: 'text', key: 'text' },
            ]}
            dataSource={allDetails.headingHierarchy}
            pagination={false}
            scroll={{ x: 'max-content' }}
            style={{ marginTop: 20 }}
          />
        </>
      )}

      {dataType !== 'all-details' && dataType !== 'page-properties' && (
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: 'max-content' }}
          style={{ marginTop: 20 }}
        />
      )}
    </div>
  );
};

export default App;
