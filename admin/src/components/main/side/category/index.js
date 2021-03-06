import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { setCategoryList } from '@/redux/action/category';
import { getArticlesByCategoryId } from '@/redux/action/article';

import CategoryMenu from '@/components/main/side/menu';
import { Input, Icon, Message } from '@/components/lib';
import { Modal } from 'antd';
import fetch from '@/utils/fetch';
// import { Dragact } from 'dragact';
import Dragger from 'react-dragger-r';

const DIALOG = {
  CREATE: '创建分类',
  UPDATE: '编辑分类'
};

class Category extends PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      dialog: {
        open: false,
        cateName: '',
        routeName: ''
      },
      menu: {
        open: false,
        options: [],
        style: {}
      }
    };
  }
  componentDidMount () {
    fetch.get('/api/category/list')
      .then((res) => {
        if (res.success) {
          this.props.setCategoryList(res.data);
          if (res.data.length > 0) {
            let { match } = this.props;
            this.changeRoute(res.data, match.params.cid, match.params.nid);
          }
        }
      });
  }
  changeRoute = (categoryList, cateId, noteId) => {
    const cateIds = categoryList.map(category => category.id.toString());
    const category = categoryList[0];
    let categoryId = cateIds.includes(cateId) ? cateId : (category && category.id);
    if (noteId) {
      this.props.history.push(`/category/${categoryId}/note/${noteId}`);
    } else {
      this.props.history.push(`/category/${categoryId}`);
    }
    if (cateId === categoryId) {
      this.props.getArticlesByCategoryId(categoryId);
    }
  }
  changeCategory = (cateId) => {
    let { articleDraft, articleDetail } = this.props;
    if (articleDraft.content !== articleDetail.content) {
      Message.warning('当前文章未保存，请先保存');
      return;
    }
    this.props.history.push(`/category/${cateId}`);
  }
  createCategory = () => {
    let { dialog } = this.state,
      name = dialog.cateName.trim();
    if (!name) {
      Message.warning('分类名称不能为空!');
      return;
    }

    fetch.post('/api/category/create', { name })
      .then((res) => {
        if (res.success) {
          let list = [...this.props.categoryList];
          list.push(res.data);
          this.props.setCategoryList(list);
          this.initDialog();
        }
      });
  }
  updateCategory = () => {
    let { dialog } = this.state,
      name = dialog.cateName.trim(),
      routeName = dialog.routeName.trim();
    if (!name) {
      Message.warning('分类名称不能为空!');
      return;
    } else {
      Message.success('分类名更改成功');
    }
    if (!routeName) {
      Message.warning('路由名称不能为空!');
      return;
    } else {
      Message.success('路由地址更改成功，请刷新');
    }
    let data = {
      id: dialog.id,
      name,
      routeName
    };
    fetch.post('/api/category/update', data)
      .then(() => {
        let list = [...this.props.categoryList];
        for (let i = 0; i < list.length; i++) {
          let category = list[i];
          if (category.id === data.id) {
            category.name = data.name;
          }
        }
        this.props.setCategoryList(list);
        this.initDialog();
      });
  }
  initDialog = (open = false, type = DIALOG.CREATE, category = {}) => {
    this.setState({
      dialog: {
        open,
        type: type,
        id: category.id,
        cateName: category.id ? category.name : '',
        routeName: category.id ? category.routeName : ''
      }
    });
  }
  changeInputValue = (key, value) => {
    this.setState({
      dialog: {
        ...this.state.dialog,
        [key]: value
      }
    });
  }
  _changeHoverCateId = (id) => {
    this.setState({
      hoverCateItem: id
    });
  }
  // 关闭菜单面板
  _closeMenusPanel = () => {
    this.setState({
      menu: {
        ...this.state.menu,
        open: false
      },
      hoverCateItem: ''
    });
  }

  hideModal = () => {
    this.setState({
      dialog: {
        open: false,
        cateName: '',
        routeName: ''
      }
    });
  };

  _submitActions = () => {
    this.initDialog();
    let { dialog } = this.state;
    switch (dialog.type) {
      case DIALOG.CREATE:
        this.createCategory();
        break;
      case DIALOG.UPDATE:
        this.updateCategory();
        break;
    }
  }
  // 右键菜单设置
  showContextMenu = (e, category) => {
    e = e || window.event;
    e.preventDefault(); // 阻止默认的右键事件
    let cursorX = e.clientX, cursorY = e.clientY;
    let opts = [{
      label: '编辑分类',
      icon: 'edit',
      onClick: () => {
        this.initDialog(true, DIALOG.UPDATE, category);
      }
    }, {
      label: '删除分类',
      icon: 'delete',
      onClick: () => {
        this.showConfirmDeleteDialog(category);
      }
    }];

    let menuHeight = 24 + opts.length * 30, // 计算菜单高度
      menuStyle = {
        left: cursorX + 'px'
      };
    if (menuHeight + cursorY < document.body.clientHeight) {
      menuStyle.top = cursorY + 'px';
    } else {
      menuStyle.bottom = (document.body.clientHeight - cursorY) + 'px';
    }
    this.setState({
      menu: {
        open: true,
        options: opts,
        style: menuStyle
      }
    });
    return false;
  }
  showConfirmDeleteDialog = (category) => {
    Modal.confirm({
      title: '你确定要删除该分类?',
      okType: 'danger',
      icon: null,
      onOk: () => {
        this.deleteCategory(category);
        Message.success('删除分类成功');
      },
      onCancel: () => {},
      okText: '确认',
      cancelText: '取消'
    });
  }
  deleteCategory = (category) => {
    let data = { id: category.id };
    fetch.post('/api/category/delete', data)
      .then((res) => {
        if (res.success) {
          let list = [...this.props.categoryList];
          for (let i = 0; i < list.length; i++) {
            let cate = list[i];
            if (cate.id === data.id) {
              list.splice(i, 1);
            }
          }
          this.props.setCategoryList(list);
        }
        this.initDialog();
      });
  }
  loginOut = () => {
    fetch.get('/api//user/signOut')
      .then((res) => {
        if (res.success) {
          this.props.history.push('/login');
        }
      });
  }
  // fakeData = () => {
  //   var { dialog } = this.state;
  //   var Y = 0;
  //   return dialog.map((item, index) => {
  //     if (index % 4 === 0) Y++;
  //     return {
  //       ...item,
  //       GridX: (index % 4) * 4,
  //       GridY: Y * 4,
  //       w: 4,
  //       h: 2,
  //       key: index + ''
  //     };
  //   });
  // }
  render () {
    let { categoryList, match } = this.props, { dialog, menu } = this.state;
    // const margin = [5, 5];
    // const dragactInit = {
    //   width: 600,
    //   col: 12,
    //   rowHeight: 800 / 12,
    //   margin: margin,
    //   className: 'normal-layout',
    //   layout: this.fakeData(),
    //   placeholder: true
    // };
    return (
      <div className="side-cate-wrap">
        <div className="side-item-header">
          <div className="side-item"><Icon type="delete" className="side-item-icon" />回收站</div>
        </div>
        <div className="side-cate-list">
          <div className="cate-title">
            <Icon type="bars" className="cate-icon--bar" />分类
            <Icon type="plus" className="cate-add" onClick={() => { this.initDialog(true); }}/>
          </div>
          <div className="cate-list">
            {
              categoryList && categoryList.map((category) => (
                <Dragger allowX = {false} >
                  <div
                    key={category.id}
                    className={`cate-item${category.id.toString() === match.params.cid ? ' selected' : ''}${category.id === this.state.hoverCateItem ? ' item-hover' : ''}`}
                    onClick={() => {
                      this.changeCategory(category.id);
                    }}
                    onMouseOver={() => { this._changeHoverCateId(category.id); }}
                    onMouseOut={() => {
                      !menu.open && this._changeHoverCateId('');
                    }}
                    onContextMenu={(e) => {
                      this.showContextMenu(e, category);
                    }}
                  >
                    <i className="cate-icon_drag"></i>
                    <div className="cate-name-box">
                      <Icon type="folder" className="cate-folder-close" />
                      {category.name + '' + (category.routeName ? ' (' + category.routeName + ')' : '')}
                    </div>
                  </div>
                </Dragger>
              ))
            }
          </div>
        </div>
        <div className="login-out-btn" onClick={this.loginOut}><Icon type="logout"/>退出</div>

        {
          menu.open ? (
            <CategoryMenu
              menu={menu}
              handles={{
                closeMenusPanel: this._closeMenusPanel
              }}
            />
          ) : null
        }
        <Modal
          visible={dialog.open}
          title={'编辑分类'}
          onOk={this._submitActions}
          onCancel={this.hideModal}
          okText = "确认"
          cancelText = "取消"
        >
          <Input
            value={dialog.cateName || ''}
            placeholder="请输入分类名"
            onChange={(e) => {
              this.changeInputValue('cateName', e.target.value);
            }}
          />
          <Input
            value={dialog.routeName || ''}
            placeholder="请输入路由地址"
            onChange={(e) => {
              this.changeInputValue('routeName', e.target.value);
            }}
          />
        </Modal>
      </div>
    );
  }
}

export default withRouter(connect(
  (state) => ({
    articleDraft: state.article.draft,
    articleDetail: state.article.detail,
    categoryList: state.category.list
  }),
  (dispatch) => ({
    setCategoryList: (list) => {
      dispatch(setCategoryList(list));
    },
    getArticlesByCategoryId: (articleId) => {
      dispatch(getArticlesByCategoryId(articleId));
    }
  })
)(Category));
