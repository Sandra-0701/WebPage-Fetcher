// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Input, Select, Checkbox, message } from 'antd';
import * as XLSX from 'xlsx';
import './style.css';

const { Option } = Select;

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
          {
            title: 'Link Text',
            dataIndex: 'linkText',
            key: 'linkText',
            render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} />,
          },
          { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
          { title: 'URL', dataIndex: 'url', key: 'url' },
          { title: 'Redirected URL', dataIndex: 'redirectedUrl', key: 'redirectedUrl' },
          {
            title: 'Status Code',
            dataIndex: 'statusCode',
            key: 'statusCode',
            render: (text, record) => (
              <span style={{ color: record.statusColor }}>{text}</span>
            ),
          },
          { title: 'Target', dataIndex: 'target', key: 'target' },
        ]);
        setData(
          Array.isArray(responseData.links)
            ? responseData.links.map((link, index) => ({ key: index, ...link }))
            : []
        );
      } else if (dataType === 'image-details') {
        setColumns([
          { title: 'Image Name', dataIndex: 'imageName', key: 'imageName' },
          {
            title: 'Alt Text',
            dataIndex: 'alt',
            key: 'alt',
            render: (text) => <div dangerouslySetInnerHTML={{ __html: text }} />,
          },
        ]);
        setData(
          responseData.images?.filter((image) => image.imageName).map((image, index) => ({
            key: index,
            ...image,
          })) || []
        );
      } else if (dataType === 'video-details') {
        setColumns([
          { title: 'Transcript', dataIndex: 'transcript', key: 'transcript' },
          { title: 'CC', dataIndex: 'cc', key: 'cc' },
          { title: 'Autoplay', dataIndex: 'autoplay', key: 'autoplay' },
          { title: 'Muted', dataIndex: 'muted', key: 'muted' },
          { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
          { title: 'Audio Track Present', dataIndex: 'audioTrack', key: 'audioTrack' },
        ]);
        setData(
          responseData.videoDetails?.map((video, index) => ({
            key: index,
            transcript: video.transcript.join(', '),
            cc: video.cc.join(', '),
            autoplay: video.autoplay,
            muted: video.muted,
            ariaLabel: video.ariaLabel,
            audioTrack: video.audioTrack,
          })) || []
        );
      } else if (dataType === 'page-properties') {
        setColumns([
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Content', dataIndex: 'content', key: 'content' },
        ]);
        const metaTagsData = Array.isArray(responseData.metaTags)
          ? responseData.metaTags.map((meta, index) => ({
              key: index,
              name: meta.name || meta.property || 'Unknown',
              content: meta.content || 'N/A',
            }))
          : [];
        console.log('Processed metaTagsData:', metaTagsData);
        setData(metaTagsData);
      } else if (dataType === 'all-details') {
        setAllDetails({
          links: responseData.links || [],
          images: responseData.images || [],
          videoDetails: responseData.videoDetails || [],
          pageProperties: Array.isArray(responseData.pageProperties) 
            ? responseData.pageProperties.map((meta, index) => ({
                key: index,
                name: meta.name || 'Unknown',
                content: meta.content || 'N/A',
              }))
            : [],
          headingHierarchy: responseData.headingHierarchy || [],
        });
      } else if (dataType === 'heading-hierarchy') {
        setColumns([
          { title: 'Level', dataIndex: 'level', key: 'level' },
          { title: 'Text', dataIndex: 'text', key: 'text' },
        ]);
        setData(
          responseData.headingHierarchy?.map((heading, index) => ({
            key: index,
            level: heading.level,
            text: heading.text,
          })) || []
        );
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
      'Video Details': Array.isArray(allDetails?.videoDetails)
        ? allDetails.videoDetails.map((video) => ({
            ...video,
            transcript: video.transcript.join(', '),
            cc: video.cc.join(', '),
          }))
        : [],
      'Page Properties': Array.isArray(allDetails?.pageProperties) ? allDetails.pageProperties : [],
      'Heading Hierarchy': Array.isArray(allDetails?.headingHierarchy) ? allDetails.headingHierarchy : [],
    };

    const wb = XLSX.utils.book_new();
    Object.entries(sheetData).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    XLSX.writeFile(wb, 'all-details.xlsx');
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
          setAllDetails(null); // Clear allDetails when changing dataType
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
      <Button type="primary" onClick={fetchData} loading={loading} style={{ marginRight: 10 }}>
        Fetch Data
      </Button>
      {dataType !== 'all-details' && (
        <Table
          dataSource={data}
          columns={columns}
          pagination={false}
          bordered
          title={() => dataType.replace('-', ' ').toUpperCase()}
        />
      )}
      {dataType === 'all-details' && (
        <>
          <Table
            dataSource={allDetails?.links || []}
            columns={[
              { title: 'Link Type', dataIndex: 'linkType', key: 'linkType' },
              { title: 'Link Text', dataIndex: 'linkText', key: 'linkText' },
              { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
              { title: 'URL', dataIndex: 'url', key: 'url' },
              { title: 'Redirected URL', dataIndex: 'redirectedUrl', key: 'redirectedUrl' },
              {
                title: 'Status Code',
                dataIndex: 'statusCode',
                key: 'statusCode',
                render: (text, record) => (
                  <span style={{ color: record.statusColor }}>{text}</span>
                ),
              },
              { title: 'Target', dataIndex: 'target', key: 'target' },
            ]}
            pagination={false}
            bordered
            title={() => 'Link Details'}
          />
          <Table
            dataSource={allDetails?.images || []}
            columns={[
              { title: 'Image Name', dataIndex: 'imageName', key: 'imageName' },
              { title: 'Alt Text', dataIndex: 'alt', key: 'alt' },
            ]}
            pagination={false}
            bordered
            title={() => 'Image Details'}
          />
          <Table
            dataSource={allDetails?.videoDetails || []}
            columns={[
              { title: 'Transcript', dataIndex: 'transcript', key: 'transcript' },
              { title: 'CC', dataIndex: 'cc', key: 'cc' },
              { title: 'Autoplay', dataIndex: 'autoplay', key: 'autoplay' },
              { title: 'Muted', dataIndex: 'muted', key: 'muted' },
              { title: 'ARIA Label', dataIndex: 'ariaLabel', key: 'ariaLabel' },
              { title: 'Audio Track Present', dataIndex: 'audioTrack', key: 'audioTrack' },
            ]}
            pagination={false}
            bordered
            title={() => 'Video Details'}
          />
          <Table
            dataSource={allDetails?.pageProperties || []}
            columns={[
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Content', dataIndex: 'content', key: 'content' },
            ]}
            pagination={false}
            bordered
            title={() => 'Page Properties'}
          />
          <Table
            dataSource={allDetails?.headingHierarchy || []}
            columns={[
              { title: 'Level', dataIndex: 'level', key: 'level' },
              { title: 'Text', dataIndex: 'text', key: 'text' },
            ]}
            pagination={false}
            bordered
            title={() => 'Heading Hierarchy'}
          />
          <Button type="primary" onClick={handleDownloadExcel}>
            Download All Details
          </Button>
        </>
      )}
    </div>
  );
};

export default App;
