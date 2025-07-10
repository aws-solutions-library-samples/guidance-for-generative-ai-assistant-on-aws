import { Amplify } from 'aws-amplify';
import { getCurrentUser } from 'aws-amplify/auth';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useState, useRef, useEffect } from 'react';
import parse from 'html-react-parser';
import pdfToText from 'react-pdftotext';
import '@aws-amplify/ui-react/styles.css';
import ImageUpload from './ImageUpload.jsx';
import './css_file.css';
import loading_dots from'../static/loading-dots.svg';
import loading_circles from'../static/loading-circles.svg';

const amplifyConfig = {
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION,
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID
    }
  }
};

 
Amplify.configure(amplifyConfig);
function ChatComponent({ signOut,user }) {
    
    const [username, setUsername] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(true);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedChat, setSelectedChat] = useState('');
    const [selectedTitle, setSelectedTitle] = useState('');
    const [sessionId,setSessionId] = useState(new Date().toISOString());
    const [fileError, setFileError] = useState('');
    const [selectedFile, setSelectedFile] = useState('');
    const [error, setError] = useState('');
    const [pdfText, setPdfText] = useState('');  
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [hoveredId, setHoveredId] = useState(null);
    const [inputModel,setInputModel] = useState('nova-micro')
    
    
    const handleFileChange = async (file) => {
            setIsLoading(true);
           // console.log(file)
            if (file) {
              try{
              
                  // Check file size (e.g., limit to 100KB)
              const allowedTypes = {
                  'application/pdf': {
                    maxSize: 200 * 1024, // 100KB for PDFs
                    label: 'PDF'
                  },
                  'audio/mpeg': {
                    maxSize: 10 * 1024 * 1024, // 10MB for MP3s
                    label: 'MP3'
                  },
                  'video/quicktime': {
                    maxSize: 50 * 1024 * 1024, // 50MB for MOV
                    label: 'MOV'
                  },
                  'video/mp4': {
                    maxSize: 50 * 1024 * 1024, // 50MB for MOV
                    label: 'mp4'
                  }
                };
          
                const fileType = file.type;
                const fileConfig = allowedTypes[fileType];
              if (fileConfig) {
                setSelectedFile(file);
                setInputMessage['Summarize the document']
                      if (file.size > fileConfig.maxSize) {
                        setSelectedFile(null);
                        setFileError(`File size for ${file.name}  exceeds ${fileConfig.maxSize / (1024 )}KB limit for ${fileConfig.label} files`);
                        setIsLoading(false);
                        return;
                      }
                      
                      
                      setFileError('');
                  
                      pdfToText(file)
                        .then(text => 
                        {
                         //console.log(text);
                         setIsLoading(false);
                         setPdfText(text);
                        })
                        .catch(error => console.error("Failed to extract text from pdf"))
                        
              
              } 
                setIsLoading(false);
                } catch(e){
                  setFileError("Error during file upload",e);
                  setIsLoading(false);
                }
            }
            else
            {
              setIsLoading(false);
              setPdfText(null);
              setFileError('No file selected');
            }
};

    
    
   const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        
        //to set autofocus to text box
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }; 
  
     
  
    const fetchUserInfo = async () => {
        try {
          const user = await getCurrentUser();
          setUsername(user.username);
          setIsChatLoading(true)
          setChatHistory([]); //clearing previous chat history to avoid duplicates on refresh
          
          let list_sessions = await fetch_sessions(user.username);
          
          if(list_sessions['response'].length >0 )
          {
            
            const newParsedData = list_sessions['response'].map((inputString, index) => {
                try {
                    // Split the string and remove empty parts
                   // console.log(` entry ${index + 1}:`)
                    const parts = inputString.split('#').filter(part => part.trim());
                    if (parts.length < 2) {
                        throw new Error(`Invalid format in entry ${index + 1}`);
                    }
                    const chats_id = parts[0];
                    const chats_title = parts.slice(1).join('#');

                    
                    try{
                          const newChats = {
                            id: chats_id,
                            title: chats_title,
                            timestamp: chats_id,
                            messages: ''
                          };
                          setChatHistory(prev => [newChats, ...prev]);
                      
                    } catch(err){
                      console.log(`Error while adding session to chat history ${index + 1}:`, err)
                    }
     
                } catch (err) {
                    // Log the error but continue processing other items
                    console.error(`Error processing entry ${index + 1}:`, err);
                }
            });

          
          
          }
          else{ 
            setSelectedChat(null);
            setSelectedTitle(null);
            setSessionId(new Date().toISOString());
            setMessages([]);
            setStreamingMessage('');
            
          }
        
          setIsChatLoading(false)
           
        }
        catch (error) {
          console.error('Error fetching user info:', error);
        }
};




  const fetch_sessions =  async (user_id) => {
     if(user_id)
     {
       try {
          // Call API Gateway endpoint
          const response = await fetch(import.meta.env.VITE_API_GATEWAY_ENDPOINT, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem(`CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user_id}.idToken`)}`,
              },
             mode:'cors',
              body: JSON.stringify({user_id:user.username, get_sessions:'true'})
          });
          
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
            
        }
        const session_list = await response.json();
        return session_list;
        
       }
       catch(e){
         console.log('Error in fetching chats:'+e);
         return '';
       }
        
        
     }
     else
     {
       return ''
     }
  }
  
  
  const fetch_session_history = async(userid,chatid) =>{
    
    try{
      
        // Call API Gateway endpoint
          const response = await fetch(import.meta.env.VITE_API_GATEWAY_ENDPOINT, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem(`CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user_id}.idToken`)}`,
              },
             mode:'cors',
              body: JSON.stringify({user_id:userid,chat_id:chatid,get_session_history:'true'})
          });
          
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const session_history = await response.json();
        return session_history
    }
    catch (e){
      console.log("Error in fetching session history")
    }
    
  }
  
 
  useEffect(() => {
      
      fetchUserInfo();

      
    }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);


  const startNewChat = () => {
    setSelectedChat(null);
    setSelectedTitle(null);
    setSessionId(new Date().toISOString());
    setMessages([]);
    setStreamingMessage('');
  };

  const selectChat = async (chatId,title) => {
    //console.log(chatId)
    setSelectedChat(chatId);
    setSelectedTitle(title);
    const selectedChatMessages = chatHistory.find(chat => chat.id === chatId)?.messages || [];
    if(selectedChatMessages.length >0 ){
          setMessages([...selectedChatMessages]);
    setStreamingMessage('');
    }
    else
    {
     const session_history = await fetch_session_history(user.username,chatId+'#'+title);
     const parsedHistory = session_history['response'].map((message) => ({
          role: message.type === "HumanMessage" ? "user" : "assistant", // Map types
          content: parse(message.content), // Chat content
        }));
      
     setMessages(parsedHistory)
     
    }

  };

 

  const handleSubmit = async (e) => {
    e.preventDefault();
      if (!inputMessage.trim() || isLoading) return;
      setIsLoading(true);
      const userMessage = {
        content: inputMessage,
        role: 'user',
        timestamp: new Date().toISOString(),
      };
      
            // set chat id on submit if no chat id selected. chat id would require in the API call to Lambda function/DDB.
            let chatsessionid= '000'
            if(selectedChat && selectedTitle)
            {
              chatsessionid = selectedChat +'#'+selectedTitle;
            }
            else
            {
              const newtitle = await inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '')
              chatsessionid = sessionId+'#'+newtitle;
              setSelectedChat(sessionId)
              setSelectedTitle(newtitle)

            }

              try {
                  // Call API Gateway endpoint
                  const response = await fetch(import.meta.env.VITE_API_GATEWAY_ENDPOINT, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem(`CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user_id}.idToken`)}`,
                      },
                     mode:'cors',
                      body: JSON.stringify({user_msg: inputMessage +' '+ pdfText,user_id:user.username, chat_id:chatsessionid,user_model:inputModel})
                  });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
    
                const data = await response.json();
               
                const aiMessage = {
                    content: parse(data.response),
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                };
            setMessages(prevMessages => [...prevMessages,userMessage, aiMessage]);
            setStreamingMessage('');
            setSelectedFile('');
            setPdfText('');
                
                
      if (!selectedChat && sessionId) {
        const ntitle = await inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '')
        const newChat = {
          id: sessionId,
          title: ntitle,
          timestamp: new Date().toISOString(),
          messages: [...messages, userMessage, aiMessage] // Include both messages

        };
        setChatHistory(prev => [newChat, ...prev]);
        setSelectedChat(newChat.id);
        setSelectedTitle(newChat.title)

      } else {

        

          setChatHistory(prev => prev.map(chat => {
            if (chat.id === selectedChat) 
                {
                  return {
                    ...chat,
                    messages: [...chat.messages, userMessage, aiMessage],
                    timestamp: new Date().toISOString(), // Update timestamp for latest activity
                    title: chat.messages.length === 0 ? // Update title only if it's the first message
                      (inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '')) :
                      chat.title
                  };
                }
            return chat;
            }
          ))
        
        
      }       

        setInputMessage(''); // to clear text box message after submitting
        
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
 
  const handleDelete = async (e,chatid,title) =>{
   e.stopPropagation(); // Prevent triggering selectChat on delete click
   const chat_id=chatid+'#'+title
    // Show confirmation alert before deleting
    const isConfirmed = window.confirm("Are you sure you want to delete this chat?");
      if (isConfirmed) {
        try{
            const chat_id=chatid+'#'+title
            
            const response = await fetch(import.meta.env.VITE_API_GATEWAY_ENDPOINT, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem(`CognitoIdentityServiceProvider.${import.meta.env.VITE_USER_POOL_CLIENT_ID}.${user_id}.idToken`)}`,
                  },
                 mode:'cors',
                  body: JSON.stringify({user_id:user.username,chat_id:chat_id,delete_chat:'true'})
              });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            if(chatid == selectedChat || chatid == sessionId){
              setMessages([]);
            }
            fetchUserInfo()
        }
        catch(e){
          console.log("Error while deleting chat",e);
        }
    }
  };

  
  return (
     
    <div className="app-container">
      <div className="nav-sidebar">
        
      {chatHistory.length >0 ? ( <button className="new-chat-btn" onClick={startNewChat} disabled={isLoading} >
          Start New Conversation
        </button>):null
      }
      

        <div className="chat-history">
                {isChatLoading ? 
        
        ( <img src={loading_circles} width={40}/>
        ):
        (
        
          chatHistory.map((chat) => (
            <div
              key={chat.id}
              className={`chat-history-item ${selectedChat === chat.id ? 'selected' : ''}`}
              onClick={() => selectChat(chat.id,chat.title)}
              
             onMouseEnter={() => setHoveredId(chat.id)} // Set the hovered chat ID
             onMouseLeave={() => setHoveredId(null)} // Clear the hovered chat ID

            >
              <div className="chat-title">{chat.title}</div>
              <div className="chat-timestamp"> 
                {new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString()} 
                
              {hoveredId === chat.id &&
                <div className="chat-message" >
                  <button className="delete-button" onClick={(e) => handleDelete(e,chat.id,chat.title)}> delete</button>
               </div>
              }
              </div>
              
            </div>
             
          ))
             
  
           )
        }
        </div>
        
       
        <button   onClick={signOut}>Sign out</button>
      </div>

      <div className="chat-container">
        <div className="messages-container">
          
          {messages.length >0 ?  messages.map((message, index) => (
              
                <div
                  key={index}
                  className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
                >
                  <div className="message-content">
                    {message.role === 'user' ? (
                      message.content
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.timestamp && 
                  <div className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  }
                </div>
           )): <div className="message ai-message"><h2 align='center'> Hello <i>{user.username}</i>👋 </h2>
            
                I'm an <b> GenAI assistant</b>, and I'm here to assist you with any questions or tasks you might have. 
                <br />Here are some examples how I can help:
                <br />
                <ul>
                <li><b>Information Lookup:</b> Need to find information on a specific topic? Just ask me, and I'll provide relevant details.</li>
                <li><b>Webpage Summarization:</b> Just provide me URL of webpage and I can summarize its content for you.</li>
                <li><b>Document Insights</b> You can upload pdf files and I can provide you chat assistant to get deeper insights.</li>
                <li><b>Personalized Recommendations:</b> Based on your preferences and interests, I can suggest products, services, or entertainment options tailored just for you.</li>
                <li><b>Language Translation:</b> I can translate text between multiple languages, making communication across borders a breeze.</li>
                </ul>
                Let's get started! 
                
                 </div>
                            
          }
          { isLoading && ( 
              <img src={loading_dots} width={40}/>
          
          ) }
          
          {streamingMessage && (
            <div className="message ai-message">
              <div className="message-content">
                {parse(streamingMessage)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit}  className='input-form'>
         <div className="input-container" >
                  <input
                    type="textarea"
                    ref={inputRef} 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything..."
                    className="message-input"
                    disabled={isLoading}
                    style={{ 
                        height: '60px', 
                        width: '200px' 
                      }}
                  />
                 
                     <ImageUpload onFileSelect={handleFileChange} />
                     
                   
                  <button type="submit" className="send-button" disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Send'}
                  </button>
                    {selectedFile &&  <div className="error-message">{selectedFile['name']}</div>}
                    {fileError && <div className="error-message">{fileError}</div>}
  
         </div> Amazon Bedrock Model:
            <select name="models" id="models" onChange={(e) => setInputModel(e.target.value)}>
              <option value="nova-micro">Amazon Nova Micro</option>
              <option value="claude-sonnet-35">Anthropic Claude 3.5 Sonnet</option>
            </select>
     
        </form> 
       
        <p className='para' align='center'>GenAI Assistant can make mistakes. Verify important informations.</p>
      </div>
    </div> 
  );
}
export default withAuthenticator(ChatComponent);

